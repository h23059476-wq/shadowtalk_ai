/**
 * ShadowTalk ProofLoop — Comprehensive Engine Test Suite
 *
 * Tests:
 * 1. Mission lifecycle transitions & invalid state transitions
 * 2. Duplicate execution & duplicate completion prevention
 * 3. Completion-condition generation & evaluation
 * 4. Deterministic verifiers (Spreadsheets, Files, Citations, Documents, Code)
 * 5. Verification failure detection & inconclusive attribution
 * 6. Recovery limits & safe recovery planning
 * 7. Human approval gate & parameter hash tampering prevention
 * 8. Cancellation safety
 * 9. Privacy-safe public proof card sanitization (zero prompts, zero secrets leaked)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  assertValidTransition,
  InvalidStateTransitionError,
  DuplicateExecutionError,
  DuplicateCompletionError,
  computeVerificationSummary,
  resolveCompletionState,
} from '../stateMachine';
import { generateConditionsFromPrompt } from '../conditionGenerator';
import {
  verifySpreadsheetData,
  verifyFileArtifact,
  verifyResearchCitations,
  verifyDocumentStructure,
  verifyDocumentItemCount,
  verifyCodeExecution,
  verifyCondition,
} from '../verifierEngine';
import {
  createApprovalRequest,
  verifyApprovalValidity,
  computeParamsHash,
} from '../approvalEngine';
import { planRecovery, MAX_RECOVERY_ATTEMPTS } from '../recoveryEngine';
import { sanitizeProofCardForSharing, scrubSensitiveContent } from '../proofCardSanitizer';
import { ProofLoopMissionEngine } from '../missionEngine';
import type { ProofLoopMission, MissionCondition, ApprovalRequest, RecoveryAttempt } from '../types';

describe('ProofLoop Engine Test Suite', () => {
  describe('Phase 2: Lifecycle & State Transitions', () => {
    it('allows valid forward transitions', () => {
      expect(canTransition('DRAFT', 'READY')).toBe(true);
      expect(canTransition('READY', 'RUNNING')).toBe(true);
      expect(canTransition('RUNNING', 'WAITING_FOR_APPROVAL')).toBe(true);
      expect(canTransition('WAITING_FOR_APPROVAL', 'RUNNING')).toBe(true);
      expect(canTransition('RUNNING', 'VERIFYING')).toBe(true);
      expect(canTransition('VERIFYING', 'COMPLETED')).toBe(true);
      expect(canTransition('VERIFYING', 'RECOVERING')).toBe(true);
      expect(canTransition('RECOVERING', 'RUNNING')).toBe(true);
      expect(canTransition('RUNNING', 'CANCELLED')).toBe(true);
    });

    it('blocks and throws on invalid transitions', () => {
      expect(canTransition('DRAFT', 'COMPLETED')).toBe(false);
      expect(canTransition('COMPLETED', 'RUNNING')).toBe(false);
      expect(canTransition('FAILED', 'READY')).toBe(false);
      expect(canTransition('CANCELLED', 'RUNNING')).toBe(false);

      expect(() => assertValidTransition('DRAFT', 'COMPLETED')).toThrow(InvalidStateTransitionError);
      expect(() => assertValidTransition('COMPLETED', 'RUNNING')).toThrow(InvalidStateTransitionError);
    });

    it('prevents duplicate execution of already-running missions', async () => {
      const runningMission: ProofLoopMission = {
        id: 'test_run_1',
        user_id: 'user_123',
        title: 'Running Task',
        userRequest: 'Run tasks',
        objective: 'Run tasks',
        state: 'RUNNING',
        conditions: [],
        steps: [],
        evidence: [],
        approvals: [],
        recoveryAttempts: [],
        currentStepIndex: 0,
        createdAt: new Date().toISOString(),
        verificationSummary: { total: 0, verified: 0, failed: 0, inconclusive: 0, notChecked: 0, completionScore: 0 },
        type: 'proofloop_mission',
      };

      await expect(ProofLoopMissionEngine.runMission(runningMission)).rejects.toThrow(DuplicateExecutionError);
    });

    it('prevents re-execution of completed missions', async () => {
      const completedMission: ProofLoopMission = {
        id: 'test_comp_1',
        user_id: 'user_123',
        title: 'Done Task',
        userRequest: 'Done',
        objective: 'Done',
        state: 'COMPLETED',
        conditions: [],
        steps: [],
        evidence: [],
        approvals: [],
        recoveryAttempts: [],
        currentStepIndex: 0,
        createdAt: new Date().toISOString(),
        verificationSummary: { total: 0, verified: 0, failed: 0, inconclusive: 0, notChecked: 0, completionScore: 100 },
        type: 'proofloop_mission',
      };

      await expect(ProofLoopMissionEngine.runMission(completedMission)).rejects.toThrow(DuplicateCompletionError);
    });
  });

  describe('Phase 3: Condition Formulation & Parsing', () => {
    it('extracts count, schema, and file requirements for spreadsheet requests', () => {
      const prompt = 'Research 10 fintech startups and prepare a spreadsheet containing their names, websites, and contact details.';
      const plan = generateConditionsFromPrompt(prompt);

      expect(plan.conditions.length).toBeGreaterThanOrEqual(3);
      expect(plan.conditions.some((c) => c.type === 'row_count' && c.params.minRows === 10)).toBe(true);
      expect(plan.conditions.some((c) => c.type === 'data_schema')).toBe(true);
      expect(plan.conditions.some((c) => c.type === 'file_exists')).toBe(true);
    });

    it('extracts citation diversity requirements for research requests', () => {
      const prompt = 'Conduct deep research on quantum computing breakthroughs and cite 5 independent papers.';
      const plan = generateConditionsFromPrompt(prompt);

      const citeCond = plan.conditions.find((c) => c.type === 'citation_verified');
      expect(citeCond).toBeDefined();
      expect(citeCond?.params.minCitations).toBe(5);
      expect(citeCond?.isCritical).toBe(true);
    });

    it('identifies consequential communication actions and adds human approval condition', () => {
      const prompt = 'Draft and send outreach emails to 10 prospective enterprise customers.';
      const plan = generateConditionsFromPrompt(prompt);

      const approvalStep = plan.suggestedSteps.find((s) => s.requiresApproval);
      expect(approvalStep).toBeDefined();
      expect(approvalStep?.consequentialType).toBe('send_communication');

      const approvalCond = plan.conditions.find((c) => c.params.requiresExplicitApproval);
      expect(approvalCond).toBeDefined();
    });
  });

  describe('Phase 4: Deterministic Verification Engine', () => {
    it('verifies valid spreadsheet CSV rows and schema correctly', () => {
      const condition: MissionCondition = {
        id: 'cond_test_csv',
        description: 'Verify 3 companies with Name, Website, Contact',
        type: 'data_schema',
        params: { minRows: 3, requiredFields: ['Name', 'Website', 'Contact'] },
        status: 'NOT_CHECKED',
        isCritical: true,
        verificationMethod: 'schema_validation',
        evidenceIds: [],
      };

      const validCsv = `Name,Website,Contact\nStripe,https://stripe.com,contact@stripe.com\nVercel,https://vercel.com,team@vercel.com\nSupabase,https://supabase.com,support@supabase.com`;

      const result = verifySpreadsheetData(condition, { dataset: validCsv });
      expect(result.status).toBe('VERIFIED');
      expect(result.isIndependent).toBe(true);
      expect(result.evidence.details.actual).toBe('3 rows');
    });

    it('fails spreadsheet verification when rows are fewer than requested', () => {
      const condition: MissionCondition = {
        id: 'cond_test_count',
        description: 'Verify 10 companies',
        type: 'row_count',
        params: { minRows: 10, requiredFields: ['Name', 'Website'] },
        status: 'NOT_CHECKED',
        isCritical: true,
        verificationMethod: 'deterministic_check',
        evidenceIds: [],
      };

      const shortCsv = `Name,Website\nStripe,https://stripe.com\nVercel,https://vercel.com`;

      const result = verifySpreadsheetData(condition, { dataset: shortCsv });
      expect(result.status).toBe('FAILED');
      expect(result.failureReason).toContain('Found only 2 records');
    });

    it('fails file verification when output artifact is empty or missing', () => {
      const condition: MissionCondition = {
        id: 'cond_test_file',
        description: 'File artifact exists',
        type: 'file_exists',
        params: { minSizeBytes: 100 },
        status: 'NOT_CHECKED',
        isCritical: true,
        verificationMethod: 'deterministic_check',
        evidenceIds: [],
      };

      const result = verifyFileArtifact(condition, { files: [] });
      expect(result.status).toBe('FAILED');
      expect(result.failureReason).toContain('No export artifact was saved');
    });

    it('marks citations INCONCLUSIVE if all links point to a single domain when diversity is required', () => {
      const condition: MissionCondition = {
        id: 'cond_cite_div',
        description: 'Verify distinct citations',
        type: 'citation_verified',
        params: { minCitations: 3, requireDomainDiversity: true },
        status: 'NOT_CHECKED',
        isCritical: true,
        verificationMethod: 'citation_check',
        evidenceIds: [],
      };

      const singleDomainCitations = [
        { url: 'https://wikipedia.org/wiki/Quantum_computing' },
        { url: 'https://wikipedia.org/wiki/Qubit' },
        { url: 'https://wikipedia.org/wiki/Quantum_entanglement' },
      ];

      const result = verifyResearchCitations(condition, { citations: singleDomainCitations });
      expect(result.status).toBe('INCONCLUSIVE');
      expect(result.failureReason).toContain('lacks source domain diversity');
    });

    it('fails document verification if placeholder text is present', () => {
      const condition: MissionCondition = {
        id: 'cond_doc_structure',
        description: 'Document structure verified',
        type: 'document_structure',
        params: {
          requiredSections: ['Executive Summary', 'Findings', 'Conclusion'],
          minWordCount: 50,
          noPlaceholderText: true,
        },
        status: 'NOT_CHECKED',
        isCritical: true,
        verificationMethod: 'content_inspection',
        evidenceIds: [],
      };

      const textWithPlaceholder = `# Executive Summary\nThis report analyzes market dynamics.\n# Findings\nCompetitor [Insert Name] dominates market share.\n# Conclusion\nTake immediate actions.`;

      const result = verifyDocumentStructure(condition, { documentContent: textWithPlaceholder });
      expect(result.status).toBe('FAILED');
      expect(result.failureReason).toContain('contains placeholder text');
    });

    it('verifies code execution exit code and detects non-zero errors', () => {
      const condition: MissionCondition = {
        id: 'cond_code_run',
        description: 'Code executes successfully',
        type: 'code_execution',
        params: { expectedExitCode: 0 },
        status: 'NOT_CHECKED',
        isCritical: true,
        verificationMethod: 'deterministic_check',
        evidenceIds: [],
      };

      const failureRun = verifyCodeExecution(condition, {
        codeExecutionResult: { exitCode: 1, stdout: '', stderr: 'TypeError: undefined is not a function', failedTests: 1 },
      });
      expect(failureRun.status).toBe('FAILED');

      const successRun = verifyCodeExecution(condition, {
        codeExecutionResult: { exitCode: 0, stdout: 'All 15 tests passed', stderr: '', passedTests: 15 },
      });
      expect(successRun.status).toBe('VERIFIED');
    });
  });

  describe('Phase 5: Recovery Limits & Safety', () => {
    it('caps automated recovery attempts at MAX_RECOVERY_ATTEMPTS to prevent infinite loops', () => {
      const condition: MissionCondition = {
        id: 'cond_recover_test',
        description: 'Fix data schema',
        type: 'data_schema',
        params: { minRows: 5, requiredFields: ['Name', 'Website'] },
        status: 'FAILED',
        isCritical: true,
        verificationMethod: 'schema_validation',
        evidenceIds: [],
      };

      const pastAttempts: RecoveryAttempt[] = [
        { id: 'att_1', conditionId: condition.id, attemptNumber: 1, maxAttempts: 2, strategy: 're-fetch', status: 'failed', details: 'try 1', timestamp: '' },
        { id: 'att_2', conditionId: condition.id, attemptNumber: 2, maxAttempts: 2, strategy: 're-format', status: 'failed', details: 'try 2', timestamp: '' },
      ];

      const plan = planRecovery(condition, pastAttempts);
      expect(plan.isSafeToRecover).toBe(false);
      expect(plan.escalationReason).toContain(`Automated recovery failed after ${MAX_RECOVERY_ATTEMPTS} attempts`);
    });
  });

  describe('Phase 6: Human Approval & Consequential Action Guard', () => {
    it('creates bound approval request with cryptographic parameter hash', () => {
      const req = createApprovalRequest({
        missionId: 'mis_123',
        stepId: 'step_2',
        actionType: 'send_communication',
        title: 'Send Outreach',
        reason: 'Contacting prospect',
        externalSystem: 'Email Gateway',
        params: { to: 'founder@example.com', subject: 'Partnership' },
      });

      expect(req.status).toBe('pending');
      expect(req.paramsHash).toBeDefined();

      // Tampering test: mutating parameters after approval invalidates it
      req.status = 'approved';
      const validCheck = verifyApprovalValidity(req, { to: 'founder@example.com', subject: 'Partnership' });
      expect(validCheck.isValid).toBe(true);

      const tamperedCheck = verifyApprovalValidity(req, { to: 'malicious@example.com', subject: 'Partnership' });
      expect(tamperedCheck.isValid).toBe(false);
      expect(tamperedCheck.reason).toContain('parameters changed after approval');
    });
  });

  describe('Phase 8: Privacy-Safe Proof Card Sanitization', () => {
    it('scrubs emails, phone numbers, and bearer tokens from public card summaries', () => {
      const raw = 'Sent email to ceo@acme.com with phone +1-555-0199 and token sk-proj1234567890abcdef12345678.';
      const scrubbed = scrubSensitiveContent(raw);

      expect(scrubbed).not.toContain('ceo@acme.com');
      expect(scrubbed).toContain('[REDACTED_EMAIL]');
      expect(scrubbed).not.toContain('+1-555-0199');
      expect(scrubbed).toContain('[REDACTED_CONTACT]');
      expect(scrubbed).not.toContain('sk-proj1234567890abcdef12345678');
      expect(scrubbed).toContain('[REDACTED_TOKEN]');
    });

    it('generates public card with zero prompt leakage and cryptographically verifiable audit hash', () => {
      const mission: ProofLoopMission = {
        id: 'mission_secret_456',
        user_id: 'user_private_uid',
        title: 'Competitor Intel Report',
        userRequest: 'Super secret private prompt detailing our internal patent strategy',
        objective: 'Analyze market competitors',
        state: 'COMPLETED',
        conditions: [
          {
            id: 'cond_1',
            description: 'Report completed',
            type: 'document_structure',
            params: {},
            status: 'VERIFIED',
            isCritical: true,
            verificationMethod: 'content_inspection',
            evidenceIds: ['ev_1'],
          },
        ],
        steps: [],
        evidence: [
          {
            id: 'ev_1',
            conditionId: 'cond_1',
            type: 'system_check',
            source: 'independent_verifier',
            isIndependent: true,
            timestamp: new Date().toISOString(),
            summary: 'Verified report with 500 words and zero placeholders.',
            details: { inspectedItem: 'report', expected: '500 words', actual: '500 words' },
          },
        ],
        approvals: [],
        recoveryAttempts: [],
        currentStepIndex: 1,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 4200,
        verificationSummary: { total: 1, verified: 1, failed: 0, inconclusive: 0, notChecked: 0, completionScore: 100 },
        type: 'proofloop_mission',
      };

      const publicCard = sanitizeProofCardForSharing(mission);

      // Verify zero prompt or private ID leakage
      expect(JSON.stringify(publicCard)).not.toContain('Super secret private prompt');
      expect(JSON.stringify(publicCard)).not.toContain('user_private_uid');
      expect(publicCard.auditHash).toMatch(/^0x[a-f0-9]{8}$/);
      expect(publicCard.verificationSummary.completionScore).toBe(100);
      expect(publicCard.verifiedConditions.length).toBe(1);
    });
  });

  describe('Full End-to-End Mission Lifecycle Execution', () => {
    it('executes a mission from DRAFT to READY to RUNNING to VERIFYING to COMPLETED', async () => {
      const mission = await ProofLoopMissionEngine.createMission(
        'Research 3 fintechs and output verified CSV table',
        [
          {
            id: 'cond_csv',
            description: '3 rows in CSV',
            type: 'row_count',
            params: { minRows: 3 },
            status: 'NOT_CHECKED',
            isCritical: true,
            verificationMethod: 'deterministic_check',
            evidenceIds: [],
          },
        ],
      );

      expect(mission.state).toBe('DRAFT');

      const ready = await ProofLoopMissionEngine.readyMission(mission);
      expect(ready.state).toBe('READY');

      const validCsv = 'Name,Site\nA,https://a.com\nB,https://b.com\nC,https://c.com';
      const completed = await ProofLoopMissionEngine.runMission(ready, {
        mockExecutionOutputs: { dataset: validCsv },
      });

      expect(completed.state).toBe('COMPLETED');
      expect(completed.verificationSummary.completionScore).toBe(100);
      expect(completed.conditions[0].status).toBe('VERIFIED');
      expect(completed.evidence.length).toBeGreaterThanOrEqual(1);
      expect(completed.evidence[0].isIndependent).toBe(true);
    });

    it('pauses at approval gate when step has consequential action, then resumes upon approval', async () => {
      const mission = await ProofLoopMissionEngine.createMission('Send newsletter');
      mission.steps = [
        {
          id: 'step_outreach',
          title: 'Broadcast Email',
          action: 'Send newsletter to subscribers',
          status: 'pending',
          requiresApproval: true,
          consequentialType: 'send_communication',
          params: { campaign: 'launch' },
        },
      ];

      const ready = await ProofLoopMissionEngine.readyMission(mission);
      const paused = await ProofLoopMissionEngine.runMission(ready);

      expect(paused.state).toBe('WAITING_FOR_APPROVAL');
      expect(paused.approvals.length).toBe(1);
      expect(paused.approvals[0].status).toBe('pending');

      // User approves
      const approved = await ProofLoopMissionEngine.approveAction(paused, paused.approvals[0].id, {});
      expect(approved.approvals[0].status).toBe('approved');
      expect(['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED']).toContain(approved.state);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 10 — Three-Product-Idea End-to-End Mission Demonstration
  //
  // This suite is the canonical proof-of-concept for ProofLoop. It demonstrates
  // exactly the scenario described in the product spec:
  //
  //   "Create a document containing three fictional product ideas, then
  //    independently verify that the document exists, is readable, and contains
  //    exactly three ideas."
  //
  // Scenarios:
  //   A. Deliberately induced failure — only 2 ideas produced initially.
  //   B. Automated recovery — recovery engine produces a targeted repair step.
  //   C. Successful completion — re-verification confirms exactly 3 ideas.
  //   D. Proof of Completion card — privacy-safe public card generated.
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Phase 10 — Three-Product-Idea End-to-End Mission Demonstration', () => {
    // ── Shared condition definitions ──────────────────────────────────────────

    const fileExistsCondition: MissionCondition = {
      id: 'cond_file_exists',
      description: 'Document artifact exists and is readable (>= 50 bytes)',
      type: 'file_exists',
      params: { minSizeBytes: 50 },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'deterministic_check',
      evidenceIds: [],
    };

    const itemCountCondition: MissionCondition = {
      id: 'cond_item_count',
      description: 'Document contains exactly 3 fictional product ideas',
      type: 'item_count_in_document',
      params: { exactCount: 3, itemName: 'fictional product ideas' },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'deterministic_check',
      evidenceIds: [],
      recoveryHint: 'Add the missing fictional product idea so the document contains exactly 3.',
    };

    // ── Scenario A: Deliberately Induced Failure ──────────────────────────────
    it('Scenario A — FAILS verification when document contains only 2 product ideas', () => {
      // Deliberately only 2 ideas in the generated document
      const documentWithTwoIdeas = `
# Product Ideas

## 1. QuantumSnap
A quantum-computing-powered instant photography app that predicts the best
shot composition before you press the shutter.

## 2. BioSync Wearable
A wearable biosensor patch that monitors 14 biomarkers in real time and
synchronises anonymised health trends to the user's personal health wallet.
      `.trim();

      const fileContext = {
        files: [{ name: 'product_ideas.md', content: documentWithTwoIdeas }],
        documentContent: documentWithTwoIdeas,
      };

      // File-exists check must PASS (document is non-empty)
      const fileResult = verifyFileArtifact(fileExistsCondition, fileContext);
      expect(fileResult.status).toBe('VERIFIED');
      expect(fileResult.isIndependent).toBe(true);

      // Item-count check must FAIL (only 2 ideas, not 3)
      const countResult = verifyDocumentItemCount(itemCountCondition, fileContext);
      expect(countResult.status).toBe('FAILED');
      expect(countResult.isIndependent).toBe(true);
      expect(countResult.failureReason).toContain('2');
      expect(countResult.failureReason).toContain('Expected exactly 3');
      expect(countResult.evidence.details.actual).toBe(2);
    });

    // ── Scenario B: Recovery Engine ───────────────────────────────────────────
    it('Scenario B — Recovery engine produces a targeted step for item_count_in_document failure', () => {
      const failedCondition: MissionCondition = {
        ...itemCountCondition,
        status: 'FAILED',
        failureReason: 'Document contains 2 fictional product ideas. Expected exactly 3.',
      };

      // No prior recovery attempts — first attempt should be safe
      const plan = planRecovery(failedCondition, []);

      expect(plan.isSafeToRecover).toBe(true);
      expect(plan.escalationReason).toBeUndefined();
      expect(plan.recoveryStep.title).toContain('Item Count Recovery');
      expect(plan.recoveryStep.title).toContain('3 fictional product ideas');
      expect(plan.recoveryStep.status).toBe('pending');
      expect(plan.strategy).toContain('3 fictional product ideas');
    });

    it('Scenario B — Recovery escalates to user after MAX_RECOVERY_ATTEMPTS exhausted', () => {
      const failedCondition: MissionCondition = {
        ...itemCountCondition,
        status: 'FAILED',
        failureReason: 'Document contains 2 fictional product ideas. Expected exactly 3.',
      };

      const exhaustedAttempts: RecoveryAttempt[] = [
        { id: 'att_1', conditionId: 'cond_item_count', attemptNumber: 1, maxAttempts: 2, strategy: 'add idea', status: 'failed', details: 'try 1', timestamp: '' },
        { id: 'att_2', conditionId: 'cond_item_count', attemptNumber: 2, maxAttempts: 2, strategy: 'add idea', status: 'failed', details: 'try 2', timestamp: '' },
      ];

      const plan = planRecovery(failedCondition, exhaustedAttempts);
      expect(plan.isSafeToRecover).toBe(false);
      expect(plan.escalationReason).toContain(`Automated recovery failed after ${MAX_RECOVERY_ATTEMPTS} attempts`);
    });

    // ── Scenario C: Successful Completion ─────────────────────────────────────
    it('Scenario C — PASSES verification after recovery adds the 3rd product idea', () => {
      // Simulate the recovered document containing all 3 ideas
      const documentWithThreeIdeas = `
# Product Ideas

## 1. QuantumSnap
A quantum-computing-powered instant photography app that predicts the best
shot composition before you press the shutter.

## 2. BioSync Wearable
A wearable biosensor patch that monitors 14 biomarkers in real time and
synchronises anonymised health trends to the user's personal health wallet.

## 3. EcoRoute Navigator
An AI-powered navigation app that optimises routes for minimum carbon
footprint across all transport modes, including walking, cycling, and
electric vehicle charging stop planning.
      `.trim();

      const recoveredFileContext = {
        files: [{ name: 'product_ideas.md', content: documentWithThreeIdeas }],
        documentContent: documentWithThreeIdeas,
      };

      // File-exists check must still PASS
      const fileResult = verifyFileArtifact(fileExistsCondition, recoveredFileContext);
      expect(fileResult.status).toBe('VERIFIED');

      // Item-count check must now PASS
      const countResult = verifyDocumentItemCount(itemCountCondition, recoveredFileContext);
      expect(countResult.status).toBe('VERIFIED');
      expect(countResult.isIndependent).toBe(true);
      expect(countResult.evidence.details.actual).toBe(3);
      expect(String(countResult.evidence.summary)).toContain('exactly 3');
    });

    // ── Full Engine: DRAFT → COMPLETED with induced failure + recovery ─────────
    it('Scenario C (integrated) — Full mission lifecycle: 2-idea failure → recovery → 3-idea COMPLETED', async () => {
      // Build a mission with the two ProofLoop conditions
      const mission = await ProofLoopMissionEngine.createMission(
        'Create a document containing three fictional product ideas',
        [
          { ...fileExistsCondition, id: 'cond_file_exists_int' },
          { ...itemCountCondition, id: 'cond_item_count_int' },
        ],
      );
      expect(mission.state).toBe('DRAFT');

      const ready = await ProofLoopMissionEngine.readyMission(mission);
      expect(ready.state).toBe('READY');

      // FIRST RUN: only 2 ideas in the document → verifier must flag FAILED
      const documentWithTwoIdeas = `
# Product Ideas
1. QuantumSnap — quantum photography AI app.
2. BioSync Wearable — 14-biomarker health patch.
      `.trim();

      const failureContext = {
        files: [{ name: 'product_ideas.md', content: documentWithTwoIdeas }],
        documentContent: documentWithTwoIdeas,
      };

      // Use runMission with the 2-idea context first, expect FAILED or PARTIALLY_COMPLETED
      const afterFirstRun = await ProofLoopMissionEngine.runMission(ready, {
        mockExecutionOutputs: failureContext,
      });

      // The item-count condition must have been marked FAILED
      const failedCond = afterFirstRun.conditions.find((c) => c.id === 'cond_item_count_int');
      expect(failedCond).toBeDefined();
      expect(failedCond!.status).toBe('FAILED');
      // file_exists should still have passed
      const fileCond = afterFirstRun.conditions.find((c) => c.id === 'cond_file_exists_int');
      expect(fileCond!.status).toBe('VERIFIED');
      // At least one recovery attempt should have been made
      expect(afterFirstRun.recoveryAttempts.length).toBeGreaterThanOrEqual(1);

      // If mission ended as FAILED (recovery also got 2-idea context), re-run with 3-idea context
      if (afterFirstRun.state === 'FAILED' || afterFirstRun.state === 'PARTIALLY_COMPLETED') {
        // Reset conditions for explicit re-run after human would manually retry
        const retryMission: typeof afterFirstRun = {
          ...afterFirstRun,
          state: 'READY',
          conditions: afterFirstRun.conditions.map((c) => ({ ...c, status: 'NOT_CHECKED' as const })),
          recoveryAttempts: [],
        };

        const documentWithThreeIdeas = `
# Product Ideas
1. QuantumSnap — quantum photography AI app.
2. BioSync Wearable — 14-biomarker health patch.
3. EcoRoute Navigator — AI carbon-optimised routing.
        `.trim();

        const successContext = {
          files: [{ name: 'product_ideas.md', content: documentWithThreeIdeas }],
          documentContent: documentWithThreeIdeas,
        };

        const finalResult = await ProofLoopMissionEngine.runMission(retryMission, {
          mockExecutionOutputs: successContext,
        });

        expect(finalResult.state).toBe('COMPLETED');
        expect(finalResult.verificationSummary.completionScore).toBe(100);
        expect(finalResult.conditions.every((c) => c.status === 'VERIFIED')).toBe(true);
        expect(finalResult.evidence.length).toBeGreaterThanOrEqual(2);
        expect(finalResult.evidence.every((e) => e.isIndependent)).toBe(true);
      } else {
        // Recovery succeeded within the same run (3-idea context already provided)
        expect(afterFirstRun.state).toBe('COMPLETED');
      }
    });

    // ── Scenario D: Proof of Completion Card ──────────────────────────────────
    it('Scenario D — Generates a privacy-safe, tamper-evident Proof of Completion card', () => {
      const completedMission: ProofLoopMission = {
        id: 'mission_product_ideas_demo',
        user_id: 'uid_private_user_abc123',
        title: 'Three Fictional Product Ideas',
        userRequest: 'PRIVATE: Internal strategy session — create product ideas for our unreleased pivot.',
        objective: 'Create a document containing three fictional product ideas',
        state: 'COMPLETED',
        conditions: [
          {
            id: 'cond_file_demo',
            description: 'Document artifact exists and is readable',
            type: 'file_exists',
            params: { minSizeBytes: 50 },
            status: 'VERIFIED',
            isCritical: true,
            verificationMethod: 'deterministic_check',
            evidenceIds: ['ev_file_1'],
          },
          {
            id: 'cond_count_demo',
            description: 'Document contains exactly 3 fictional product ideas',
            type: 'item_count_in_document',
            params: { exactCount: 3, itemName: 'fictional product ideas' },
            status: 'VERIFIED',
            isCritical: true,
            verificationMethod: 'deterministic_check',
            evidenceIds: ['ev_count_1'],
          },
        ],
        steps: [],
        evidence: [
          {
            id: 'ev_file_1',
            conditionId: 'cond_file_demo',
            type: 'file_artifact',
            source: 'sandbox_filesystem',
            isIndependent: true,
            timestamp: new Date().toISOString(),
            summary: 'Verified artifact "product_ideas.md" (412 bytes, readable, valid format).',
            details: { inspectedItem: 'product_ideas.md', expected: 'Readable file >= 50 bytes', actual: '412 bytes' },
          },
          {
            id: 'ev_count_1',
            conditionId: 'cond_count_demo',
            type: 'dataset_inspection',
            source: 'document_item_inspector',
            isIndependent: true,
            timestamp: new Date().toISOString(),
            summary: 'Verified document contains exactly 3 fictional product ideas: [QuantumSnap, BioSync Wearable, EcoRoute Navigator].',
            details: { inspectedItem: 'fictional product ideas', expected: 'Exactly 3', actual: 3 },
          },
        ],
        recoveryAttempts: [
          {
            id: 'rec_demo_1',
            conditionId: 'cond_count_demo',
            attemptNumber: 1,
            maxAttempts: 2,
            strategy: 'Synthesize missing items to complete exactly 3 fictional product ideas.',
            status: 'succeeded',
            details: 'Added EcoRoute Navigator as the 3rd idea.',
            timestamp: new Date().toISOString(),
          },
        ],
        approvals: [],
        currentStepIndex: 2,
        createdAt: new Date(Date.now() - 35000).toISOString(),
        startedAt: new Date(Date.now() - 32000).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 32000,
        verificationSummary: { total: 2, verified: 2, failed: 0, inconclusive: 0, notChecked: 0, completionScore: 100 },
        type: 'proofloop_mission',
      };

      const card = sanitizeProofCardForSharing(completedMission);

      // Must not leak the private user prompt
      expect(JSON.stringify(card)).not.toContain('PRIVATE: Internal strategy session');
      expect(JSON.stringify(card)).not.toContain('uid_private_user_abc123');

      // Must preserve verifiable evidence details
      expect(card.verificationSummary.completionScore).toBe(100);
      expect(card.verifiedConditions.length).toBe(2);
      expect(card.verifiedConditions[0].description).toContain('Document artifact exists');
      expect(card.verifiedConditions[1].description).toContain('exactly 3 fictional product ideas');

      // Evidence must be present
      expect(card.evidenceItems.length).toBe(2);
      expect(card.evidenceItems.every((e) => e.isIndependent)).toBe(true);

      // Recovery metadata must be visible (trust transparency)
      expect(card.recoveryAttemptsCount).toBe(1);

      // Must have a tamper-evident audit hash
      expect(card.auditHash).toMatch(/^0x[a-f0-9]{8}$/);

      // Mission title must be preserved (not sensitive)
      expect(card.missionTitle).toBe('Three Fictional Product Ideas');
    });
  });
});
