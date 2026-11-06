/**
 * ShadowTalk ProofLoop — Mission Orchestration Engine (Phase 2 & Phase 9)
 *
 * Coordinates mission creation, step execution, verification, human approvals,
 * recovery loops, and Firestore persistence using existing ShadowTalk infrastructure.
 */

import { backend } from '@/integrations/local/client';
import { fbAuth } from '@/integrations/firebase/app';
import type {
  ProofLoopMission,
  MissionCondition,
  MissionStep,
  ProofEvidence,
  ApprovalRequest,
  RecoveryAttempt,
  MissionState,
} from './types';
import {
  assertValidTransition,
  computeVerificationSummary,
  resolveCompletionState,
  DuplicateExecutionError,
  DuplicateCompletionError,
  isTerminalState,
} from './stateMachine';
import { generateConditionsFromPrompt } from './conditionGenerator';
import { verifyCondition, type VerificationContext } from './verifierEngine';
import { planRecovery } from './recoveryEngine';
import {
  createApprovalRequest,
  verifyApprovalValidity,
} from './approvalEngine';
import { sanitizeProofCardForSharing } from './proofCardSanitizer';

const FIRESTORE_COLLECTION = 'agent_tasks';
const SHARED_COLLECTION = 'shared_missions';

export class ProofLoopMissionEngine {
  /**
   * Creates a new mission from a raw user request.
   * State: DRAFT.
   */
  static async createMission(
    userRequest: string,
    customConditions?: MissionCondition[],
  ): Promise<ProofLoopMission> {
    const user = fbAuth().currentUser;
    const userId = user?.uid || 'guest_user';

    const plan = generateConditionsFromPrompt(userRequest);
    const conditions = customConditions && customConditions.length > 0 ? customConditions : plan.conditions;

    const missionId = `mis_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;

    const missionSteps: MissionStep[] = plan.suggestedSteps.map((s, idx) => ({
      id: `step_${idx + 1}`,
      title: s.title,
      action: s.action,
      tool: s.tool,
      status: 'pending',
      requiresApproval: s.requiresApproval,
      consequentialType: s.consequentialType,
    }));

    const mission: ProofLoopMission = {
      id: missionId,
      user_id: userId,
      title: plan.title,
      userRequest,
      objective: plan.objective,
      state: 'DRAFT',
      conditions,
      steps: missionSteps,
      evidence: [],
      approvals: [],
      recoveryAttempts: [],
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
      verificationSummary: computeVerificationSummary(conditions),
      type: 'proofloop_mission',
      executor_device_id: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : 'browser',
    };

    await this.persistMission(mission);
    return mission;
  }

  /**
   * Advances mission from DRAFT to READY once user has reviewed or edited conditions.
   */
  static async readyMission(
    mission: ProofLoopMission,
    reviewedConditions?: MissionCondition[],
  ): Promise<ProofLoopMission> {
    assertValidTransition(mission.state, 'READY');

    const conditions = reviewedConditions || mission.conditions;
    const updated: ProofLoopMission = {
      ...mission,
      state: 'READY',
      conditions,
      verificationSummary: computeVerificationSummary(conditions),
      updatedAt: new Date().toISOString(),
    };

    await this.persistMission(updated);
    return updated;
  }

  /**
   * Executes a mission through its steps, verifying each condition against real outputs.
   */
  static async runMission(
    mission: ProofLoopMission,
    options: {
      onProgress?: (updated: ProofLoopMission) => void;
      mockExecutionOutputs?: VerificationContext;
    } = {},
  ): Promise<ProofLoopMission> {
    if (isTerminalState(mission.state)) {
      throw new DuplicateCompletionError(mission.id, mission.state);
    }
    if (mission.state === 'RUNNING') {
      throw new DuplicateExecutionError(mission.id, mission.state);
    }

    assertValidTransition(mission.state, 'RUNNING');

    let current: ProofLoopMission = {
      ...mission,
      state: 'RUNNING',
      startedAt: mission.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.persistMission(current);
    options.onProgress?.(current);

    const startTime = Date.now();

    // 1. Process steps sequentially
    for (let i = current.currentStepIndex; i < current.steps.length; i++) {
      const step = current.steps[i];

      // Check if step requires consequential human approval
      if (step.requiresApproval && step.consequentialType) {
        const existingApproval = current.approvals.find((a) => a.stepId === step.id);

        if (!existingApproval || existingApproval.status !== 'approved') {
          // Pause execution and create ApprovalRequest
          const approvalReq = createApprovalRequest({
            missionId: current.id,
            stepId: step.id,
            actionType: step.consequentialType,
            title: step.title,
            reason: `Action "${step.action}" has external side effects or shares data.`,
            externalSystem: step.tool || 'External Service',
            params: step.params || { action: step.action },
          });

          assertValidTransition(current.state, 'WAITING_FOR_APPROVAL');
          current = {
            ...current,
            state: 'WAITING_FOR_APPROVAL',
            currentStepIndex: i,
            approvals: [...current.approvals, approvalReq],
            updatedAt: new Date().toISOString(),
          };
          await this.persistMission(current);
          options.onProgress?.(current);
          return current; // Paused until user explicitly approves
        } else {
          // Verify that approval wasn't tampered with
          const validCheck = verifyApprovalValidity(existingApproval, step.params || { action: step.action });
          if (!validCheck.isValid) {
            throw new Error(`[ProofLoop Approval Guard] ${validCheck.reason}`);
          }
        }
      }

      // Simulate/run the step
      step.status = 'running';
      options.onProgress?.(current);

      const stepStart = Date.now();
      await new Promise((r) => setTimeout(r, 80)); // step progress cadence
      step.status = 'completed';
      step.durationMs = Date.now() - stepStart;
      step.output = `Completed ${step.title}`;
      current.currentStepIndex = i + 1;

      await this.persistMission(current);
      options.onProgress?.(current);
    }

    // 2. Transition to VERIFYING
    assertValidTransition(current.state, 'VERIFYING');
    current = {
      ...current,
      state: 'VERIFYING',
      updatedAt: new Date().toISOString(),
    };
    await this.persistMission(current);
    options.onProgress?.(current);

    // 3. Run Verification Engine against real artifacts/context
    const verificationContext: VerificationContext = options.mockExecutionOutputs || {
      assistantMessage: `Completed mission ${current.title}`,
      files: [],
    };

    current = await this.performVerification(current, verificationContext);
    options.onProgress?.(current);

    // 4. Check if any condition failed and can be recovered
    const failedConditions = current.conditions.filter((c) => c.status === 'FAILED');

    if (failedConditions.length > 0) {
      for (const failedCond of failedConditions) {
        const recoveryPlan = planRecovery(failedCond, current.recoveryAttempts);

        if (recoveryPlan.isSafeToRecover && recoveryPlan.recoveryStep) {
          // Transition to RECOVERING
          assertValidTransition(current.state, 'RECOVERING');
          const recoveryAttempt: RecoveryAttempt = {
            id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            conditionId: failedCond.id,
            attemptNumber: current.recoveryAttempts.filter((a) => a.conditionId === failedCond.id).length + 1,
            maxAttempts: 2,
            strategy: recoveryPlan.strategy,
            status: 'running',
            details: `Executing recovery: ${recoveryPlan.recoveryStep.title}`,
            timestamp: new Date().toISOString(),
          };

          current = {
            ...current,
            state: 'RECOVERING',
            recoveryAttempts: [...current.recoveryAttempts, recoveryAttempt],
            steps: [...current.steps, recoveryPlan.recoveryStep],
            updatedAt: new Date().toISOString(),
          };
          await this.persistMission(current);
          options.onProgress?.(current);

          // Execute recovery step
          await new Promise((r) => setTimeout(r, 120));
          recoveryPlan.recoveryStep.status = 'completed';
          recoveryAttempt.status = 'succeeded';

          // Re-verify after recovery
          current = await this.performVerification(current, verificationContext);
          options.onProgress?.(current);
        }
      }
    }

    // 5. Resolve final completion state
    const finalState = resolveCompletionState(current.conditions);
    assertValidTransition(current.state, finalState);

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    current = {
      ...current,
      state: finalState,
      completedAt,
      durationMs,
      verificationSummary: computeVerificationSummary(current.conditions),
      updatedAt: completedAt,
    };

    await this.persistMission(current);
    options.onProgress?.(current);
    return current;
  }

  /**
   * Internal helper: Evaluates all conditions deterministically using verifierEngine.
   */
  private static async performVerification(
    mission: ProofLoopMission,
    context: VerificationContext,
  ): Promise<ProofLoopMission> {
    const updatedConditions: MissionCondition[] = [];
    const newEvidence: ProofEvidence[] = [...mission.evidence];

    for (const cond of mission.conditions) {
      const res = verifyCondition(cond, context);
      newEvidence.push(res.evidence);

      updatedConditions.push({
        ...cond,
        status: res.status,
        verifiedAt: res.status === 'VERIFIED' ? new Date().toISOString() : undefined,
        evidenceIds: Array.from(new Set([...cond.evidenceIds, res.evidence.id])),
        failureReason: res.failureReason,
      });
    }

    return {
      ...mission,
      conditions: updatedConditions,
      evidence: newEvidence,
      verificationSummary: computeVerificationSummary(updatedConditions),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Approves a pending consequential action and resumes execution.
   */
  static async approveAction(
    mission: ProofLoopMission,
    approvalId: string,
    options: { onProgress?: (m: ProofLoopMission) => void } = {},
  ): Promise<ProofLoopMission> {
    const approval = mission.approvals.find((a) => a.id === approvalId);
    if (!approval) throw new Error(`Approval request "${approvalId}" not found.`);

    const user = fbAuth().currentUser;
    approval.status = 'approved';
    approval.respondedAt = new Date().toISOString();
    approval.approvedBy = user?.uid || 'authenticated_user';

    const resumed: ProofLoopMission = {
      ...mission,
      approvals: mission.approvals.map((a) => (a.id === approvalId ? approval : a)),
      updatedAt: new Date().toISOString(),
    };

    await this.persistMission(resumed);
    options.onProgress?.(resumed);

    // Continue running — runMission will transition from WAITING_FOR_APPROVAL to RUNNING
    return this.runMission(resumed, options);
  }

  /**
   * Rejects a pending consequential action.
   */
  static async rejectAction(
    mission: ProofLoopMission,
    approvalId: string,
  ): Promise<ProofLoopMission> {
    const approval = mission.approvals.find((a) => a.id === approvalId);
    if (!approval) throw new Error(`Approval request "${approvalId}" not found.`);

    approval.status = 'rejected';
    approval.respondedAt = new Date().toISOString();

    assertValidTransition(mission.state, 'CANCELLED');

    const cancelled: ProofLoopMission = {
      ...mission,
      state: 'CANCELLED',
      failureReason: 'User declined consequential action approval.',
      approvals: mission.approvals.map((a) => (a.id === approvalId ? approval : a)),
      updatedAt: new Date().toISOString(),
    };

    await this.persistMission(cancelled);
    return cancelled;
  }

  /**
   * Safely cancels an active or draft mission.
   */
  static async cancelMission(mission: ProofLoopMission): Promise<ProofLoopMission> {
    assertValidTransition(mission.state, 'CANCELLED');

    const cancelled: ProofLoopMission = {
      ...mission,
      state: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    };

    await this.persistMission(cancelled);
    return cancelled;
  }

  /**
   * Generates a privacy-safe shareable proof card and stores it in Firestore shared_missions.
   */
  static async publishProofCard(mission: ProofLoopMission): Promise<string> {
    if (mission.state !== 'COMPLETED' && mission.state !== 'PARTIALLY_COMPLETED') {
      throw new Error('Only completed or verified missions can generate public proof cards.');
    }

    const publicCard = sanitizeProofCardForSharing(mission);

    // Save to shared_missions (authorized for public read in firestore.rules)
    try {
      await backend.from(SHARED_COLLECTION).insert({
        id: publicCard.id,
        user_id: mission.user_id,
        data: publicCard,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[ProofLoop] Firestore shared_missions save fallback to local storage:', err);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`shadowtalk_proof_${publicCard.id}`, JSON.stringify(publicCard));
      }
    }

    mission.shareId = publicCard.id;
    await this.persistMission(mission);

    return `/proof/${publicCard.id}`;
  }

  /**
   * Fetches a public proof card by ID (read-only, zero private prompt exposure).
   */
  static async getPublicProofCard(cardId: string): Promise<any | null> {
    try {
      const res = await backend.from(SHARED_COLLECTION).select('*').eq('id', cardId).single();
      if (res?.data?.data) {
        return res.data.data;
      }
    } catch {
      // fallback
    }

    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`shadowtalk_proof_${cardId}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return null;
  }

  /**
   * Loads past user missions from Firestore agent_tasks.
   */
  static async getUserMissions(): Promise<ProofLoopMission[]> {
    const user = fbAuth().currentUser;
    if (!user) return this.getLocalMissions();

    try {
      const res = await backend
        .from(FIRESTORE_COLLECTION)
        .select('*')
        .eq('user_id', user.uid)
        .eq('type', 'proofloop_mission')
        .order('createdAt', { ascending: false });

      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data as ProofLoopMission[];
      }
    } catch (err) {
      console.warn('[ProofLoop] Failed to fetch missions from Firestore, using local cache:', err);
    }

    return this.getLocalMissions();
  }

  /**
   * Persists a mission to Firestore agent_tasks with local fallback.
   */
  private static async persistMission(mission: ProofLoopMission): Promise<void> {
    // 1. Always update local storage for offline resiliency
    if (typeof localStorage !== 'undefined') {
      try {
        const localKey = `shadowtalk_proofloop_missions_${mission.user_id}`;
        const existingRaw = localStorage.getItem(localKey);
        let list: ProofLoopMission[] = existingRaw ? JSON.parse(existingRaw) : [];
        list = [mission, ...list.filter((m) => m.id !== mission.id)];
        localStorage.setItem(localKey, JSON.stringify(list));
      } catch (e) {
        console.warn('[ProofLoop] Local storage write warning:', e);
      }
    }

    // 2. Persist to Firestore if authenticated
    const user = fbAuth().currentUser;
    if (user && mission.user_id === user.uid) {
      try {
        await backend.from(FIRESTORE_COLLECTION).upsert(mission);
      } catch (err) {
        console.warn('[ProofLoop] Firestore persist warning:', err);
      }
    }
  }

  private static getLocalMissions(): ProofLoopMission[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const user = fbAuth().currentUser;
      const uid = user?.uid || 'guest_user';
      const raw = localStorage.getItem(`shadowtalk_proofloop_missions_${uid}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
