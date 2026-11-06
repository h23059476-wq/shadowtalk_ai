/**
 * ShadowTalk ProofLoop — React Hook
 *
 * Exposes mission lifecycle controls, real-time reactive state, approval handling,
 * and evidence inspection.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ProofLoopMission,
  MissionCondition,
} from '@/lib/proofloop/types';
import { ProofLoopMissionEngine } from '@/lib/proofloop/missionEngine';
import {
  executeMissionPrompt,
  getActiveInferencePath,
  type ActiveInferenceMetadata,
} from '@/lib/proofloop/proofloopInferenceBridge';
import type { VerificationContext } from '@/lib/proofloop/verifierEngine';
import { toast } from 'sonner';

export function useProofLoop() {
  const [activeMission, setActiveMission] = useState<ProofLoopMission | null>(null);
  const [missionsList, setMissionsList] = useState<ProofLoopMission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeInferencePath, setActiveInferencePath] = useState<ActiveInferenceMetadata | null>(null);

  // Eagerly detect active inference path for display in the workspace UI
  useEffect(() => {
    getActiveInferencePath()
      .then(setActiveInferencePath)
      .catch((err) => console.warn('[useProofLoop] Could not detect inference path:', err));
  }, []);

  // Load history on mount
  useEffect(() => {
    let mounted = true;
    ProofLoopMissionEngine.getUserMissions()
      .then((list) => {
        if (mounted) {
          setMissionsList(list);
          if (!activeMission && list.length > 0) {
            setActiveMission(list[0]);
          }
        }
      })
      .catch((err) => console.error('[useProofLoop] Error fetching missions:', err));
    return () => {
      mounted = false;
    };
  }, []);

  const createMission = useCallback(async (userRequest: string, customConditions?: MissionCondition[]) => {
    if (!userRequest.trim()) {
      toast.error('Please describe your mission objective.');
      return null;
    }
    setIsLoading(true);
    try {
      const mission = await ProofLoopMissionEngine.createMission(userRequest, customConditions);
      setActiveMission(mission);
      setMissionsList((prev) => [mission, ...prev.filter((m) => m.id !== mission.id)]);
      toast.success('Mission plan & completion conditions generated.');
      return mission;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create mission plan.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConditions = useCallback((conditions: MissionCondition[]) => {
    if (!activeMission) return;
    setActiveMission((prev) => (prev ? { ...prev, conditions } : null));
  }, [activeMission]);

  const startMission = useCallback(async (
    missionToRun?: ProofLoopMission,
    options: { mockOutputs?: VerificationContext; forceFailureMode?: boolean } = {},
  ) => {
    const target = missionToRun || activeMission;
    if (!target) return;

    setIsExecuting(true);
    try {
      // First ensure it's in READY state if currently in DRAFT
      let current = target;
      if (current.state === 'DRAFT') {
        current = await ProofLoopMissionEngine.readyMission(current);
        setActiveMission(current);
      }

      // Build VerificationContext from inference bridge if no mockOutputs provided
      let verificationContext: VerificationContext | undefined = options.mockOutputs;

      if (!verificationContext) {
        // Detect and validate active inference path — will throw immediately if unavailable
        const inferenceMeta = await getActiveInferencePath();
        setActiveInferencePath(inferenceMeta);

        if (!inferenceMeta.isAvailable) {
          toast.error(
            `[${inferenceMeta.providerLabel}] ${inferenceMeta.unavailabilityReason}`,
            { duration: 6000 },
          );
          return;
        }

        toast.info(`Running via ${inferenceMeta.providerLabel} (${inferenceMeta.model})…`);

        // Execute the mission prompt through the active path
        let inferenceContent = '';
        const inferenceResult = await executeMissionPrompt(
          `Mission: ${current.objective}\n\nConditions to satisfy:\n${current.conditions.map((c, i) => `${i + 1}. ${c.description}`).join('\n')}\n\nProvide structured output that satisfies ALL conditions above. Be explicit and numbered.`,
          {
            systemPrompt:
              'You are a precision execution agent. Follow the mission exactly. Structure output with numbered items, clear sections, and verifiable content. Do NOT use placeholders.',
            forceFailureMode: options.forceFailureMode,
            onDelta: (delta) => {
              inferenceContent += delta;
            },
          },
        );

        verificationContext = {
          assistantMessage: inferenceResult.content,
          documentContent: inferenceResult.content,
          files: [
            {
              name: `mission_output_${current.id.slice(0, 8)}.md`,
              content: inferenceResult.content,
              size: new TextEncoder().encode(inferenceResult.content).length,
              mimeType: 'text/markdown',
            },
          ],
        };

        toast.success(`AI response received via ${inferenceResult.providerUsed}.`, { duration: 3000 });
      }

      const result = await ProofLoopMissionEngine.runMission(current, {
        mockExecutionOutputs: verificationContext,
        onProgress: (updated) => {
          setActiveMission(updated);
          setMissionsList((prev) => [updated, ...prev.filter((m) => m.id !== updated.id)]);
        },
      });

      setActiveMission(result);
      setMissionsList((prev) => [result, ...prev.filter((m) => m.id !== result.id)]);

      if (result.state === 'COMPLETED') {
        toast.success('Mission 100% verified! Proof of completion ready.');
      } else if (result.state === 'PARTIALLY_COMPLETED') {
        toast.warning('Mission finished with partial condition verification.');
      } else if (result.state === 'FAILED') {
        toast.error('Mission failed verification conditions.');
      } else if (result.state === 'WAITING_FOR_APPROVAL') {
        toast.info('Action requires human approval to proceed.');
      }
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Execution error.');
    } finally {
      setIsExecuting(false);
    }
  }, [activeMission]);

  const approveAction = useCallback(async (approvalId: string) => {
    if (!activeMission) return;
    setIsExecuting(true);
    try {
      const result = await ProofLoopMissionEngine.approveAction(activeMission, approvalId, {
        onProgress: (updated) => {
          setActiveMission(updated);
          setMissionsList((prev) => [updated, ...prev.filter((m) => m.id !== updated.id)]);
        },
      });
      setActiveMission(result);
      toast.success('Action approved. Mission resumed.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve action.');
    } finally {
      setIsExecuting(false);
    }
  }, [activeMission]);

  const rejectAction = useCallback(async (approvalId: string) => {
    if (!activeMission) return;
    try {
      const result = await ProofLoopMissionEngine.rejectAction(activeMission, approvalId);
      setActiveMission(result);
      setMissionsList((prev) => [result, ...prev.filter((m) => m.id !== result.id)]);
      toast.info('Consequential action rejected. Mission halted.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject action.');
    }
  }, [activeMission]);

  const cancelMission = useCallback(async () => {
    if (!activeMission) return;
    try {
      const result = await ProofLoopMissionEngine.cancelMission(activeMission);
      setActiveMission(result);
      setMissionsList((prev) => [result, ...prev.filter((m) => m.id !== result.id)]);
      toast.info('Mission cancelled.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel mission.');
    }
  }, [activeMission]);

  const publishProof = useCallback(async () => {
    if (!activeMission) return null;
    try {
      const url = await ProofLoopMissionEngine.publishProofCard(activeMission);
      setActiveMission((prev) => (prev ? { ...prev, shareId: url.split('/').pop() } : null));
      toast.success('Privacy-safe proof card published!');
      return url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate proof card.');
      return null;
    }
  }, [activeMission]);

  return {
    activeMission,
    setActiveMission,
    missionsList,
    isLoading,
    isExecuting,
    activeInferencePath,
    createMission,
    updateConditions,
    startMission,
    approveAction,
    rejectAction,
    cancelMission,
    publishProof,
  };
}
