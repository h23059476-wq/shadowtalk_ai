/**
 * ShadowTalk ProofLoop — Failure Detection & Safe Recovery Engine (Phase 5)
 *
 * Provides bounded, safe recovery plans when deterministic verification fails.
 * Guarantees zero infinite loops (max 2 attempts per condition), avoids duplicating
 * consequential side effects, and escalates to user whenever safety cannot be ensured.
 */

import type { MissionCondition, RecoveryAttempt, MissionStep } from './types';

export const MAX_RECOVERY_ATTEMPTS = 2;

export interface RecoveryPlan {
  conditionId: string;
  isSafeToRecover: boolean;
  strategy: string;
  recoveryStep: MissionStep;
  escalationReason?: string;
}

/**
 * Evaluates whether a failed condition can be safely recovered automatically.
 */
export function planRecovery(
  condition: MissionCondition,
  existingAttempts: RecoveryAttempt[],
): RecoveryPlan {
  const pastAttemptsForCondition = existingAttempts.filter(
    (a) => a.conditionId === condition.id,
  );

  // 1. Check recovery attempt bounds
  if (pastAttemptsForCondition.length >= MAX_RECOVERY_ATTEMPTS) {
    return {
      conditionId: condition.id,
      isSafeToRecover: false,
      strategy: 'Maximum automated recovery attempts reached.',
      recoveryStep: {
        id: `rec_${Date.now()}`,
        title: 'Recovery Limit Reached',
        action: 'Escalate to user',
        status: 'failed',
      },
      escalationReason: `Automated recovery failed after ${MAX_RECOVERY_ATTEMPTS} attempts. User decision required.`,
    };
  }

  // 2. Identify strategy based on condition type and failure reason
  switch (condition.type) {
    case 'row_count':
    case 'data_schema': {
      const required = condition.params.requiredFields || [];
      const minRows = condition.params.minRows || 1;
      return {
        conditionId: condition.id,
        isSafeToRecover: true,
        strategy: `Synthesize missing fields or gather additional records (target: ${minRows} rows with [${required.join(', ')}]).`,
        recoveryStep: {
          id: `step_rec_${Math.random().toString(36).slice(2, 8)}`,
          title: `Data Recovery: Complete ${minRows} Records`,
          action: `Search and format missing records to meet exact schema: [${required.join(', ')}].`,
          tool: 'code_executor',
          status: 'pending',
          params: { conditionId: condition.id, requiredFields: required, minRows },
        },
      };
    }

    case 'file_exists': {
      const format = condition.params.format || 'csv_or_json';
      return {
        conditionId: condition.id,
        isSafeToRecover: true,
        strategy: `Re-export missing or truncated artifact in valid ${format} format.`,
        recoveryStep: {
          id: `step_rec_${Math.random().toString(36).slice(2, 8)}`,
          title: 'Artifact Recovery: Re-export File',
          action: `Generate complete, non-empty deliverable file in ${format} format.`,
          tool: 'document_generator',
          status: 'pending',
          params: { conditionId: condition.id, format },
        },
      };
    }

    case 'citation_verified':
    case 'web_resource': {
      const minCitations = condition.params.minCitations || 3;
      return {
        conditionId: condition.id,
        isSafeToRecover: true,
        strategy: `Perform targeted web search to find missing verified source URLs (target: ${minCitations} distinct sources).`,
        recoveryStep: {
          id: `step_rec_${Math.random().toString(36).slice(2, 8)}`,
          title: 'Citation Recovery: Gather Direct Sources',
          action: `Query search engine to obtain reputable, distinct sources.`,
          tool: 'web_search',
          status: 'pending',
          params: { conditionId: condition.id, minCitations },
        },
      };
    }

    case 'document_structure': {
      const missing = condition.failureReason || 'Document structure incomplete';
      return {
        conditionId: condition.id,
        isSafeToRecover: true,
        strategy: 'Restructure document to include all required sections and eliminate placeholder copy.',
        recoveryStep: {
          id: `step_rec_${Math.random().toString(36).slice(2, 8)}`,
          title: 'Document Recovery: Section Formatting',
          action: `Update document structure: ${missing}`,
          tool: 'document_generator',
          status: 'pending',
          params: { conditionId: condition.id },
        },
      };
    }

    case 'item_count_in_document': {
      const targetCount = condition.params.exactCount || 3;
      const itemName = condition.params.itemName || 'fictional product ideas';
      return {
        conditionId: condition.id,
        isSafeToRecover: true,
        strategy: `Synthesize missing items to complete exactly ${targetCount} ${itemName}.`,
        recoveryStep: {
          id: `step_rec_${Math.random().toString(36).slice(2, 8)}`,
          title: `Item Count Recovery: Complete ${targetCount} ${itemName}`,
          action: `Generate additional ${itemName} to ensure the document contains exactly ${targetCount}.`,
          tool: 'document_generator',
          status: 'pending',
          params: { conditionId: condition.id, exactCount: targetCount, itemName },
        },
      };
    }

    case 'code_execution': {
      return {
        conditionId: condition.id,
        isSafeToRecover: true,
        strategy: 'Analyze runtime traceback, correct code syntax/logic, and re-execute in sandbox.',
        recoveryStep: {
          id: `step_rec_${Math.random().toString(36).slice(2, 8)}`,
          title: 'Code Recovery: Fix Runtime Defect',
          action: 'Patch code to resolve runtime error and re-run sandbox tests.',
          tool: 'code_executor',
          status: 'pending',
          params: { conditionId: condition.id },
        },
      };
    }

    case 'custom_check':
    default: {
      // If it requires human approval or an external mutation, automatic retry without user is unsafe!
      if (condition.params?.requiresExplicitApproval) {
        return {
          conditionId: condition.id,
          isSafeToRecover: false,
          strategy: 'Action requires human approval; automatic retry unsafe.',
          recoveryStep: {
            id: `rec_${Date.now()}`,
            title: 'Waiting for Human Decision',
            action: 'Prompt user for approval',
            status: 'pending',
          },
          escalationReason: 'Cannot automatically bypass explicit human approval gate.',
        };
      }

      return {
        conditionId: condition.id,
        isSafeToRecover: true,
        strategy: 'Refine deliverable to satisfy criteria.',
        recoveryStep: {
          id: `step_rec_${Math.random().toString(36).slice(2, 8)}`,
          title: 'Deliverable Refinement',
          action: `Address failure: ${condition.failureReason || 'Unmet condition'}`,
          tool: 'strategy_agent',
          status: 'pending',
          params: { conditionId: condition.id },
        },
      };
    }
  }
}
