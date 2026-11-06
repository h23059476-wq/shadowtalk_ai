/**
 * ShadowTalk ProofLoop — State Machine & Lifecycle Guard
 *
 * Enforces explicit mission lifecycle states and strict valid transitions.
 * Prevents duplicate executions, duplicate completion events, and invalid operations.
 */

import type { MissionState, MissionCondition, VerificationSummary } from './types';

export const ALLOWED_TRANSITIONS: Record<MissionState, MissionState[]> = {
  DRAFT: ['READY', 'CANCELLED'],
  READY: ['RUNNING', 'DRAFT', 'CANCELLED'],
  RUNNING: ['WAITING_FOR_APPROVAL', 'VERIFYING', 'FAILED', 'CANCELLED'],
  WAITING_FOR_APPROVAL: ['RUNNING', 'FAILED', 'CANCELLED'],
  VERIFYING: ['COMPLETED', 'PARTIALLY_COMPLETED', 'RECOVERING', 'FAILED', 'CANCELLED'],
  RECOVERING: ['RUNNING', 'VERIFYING', 'PARTIALLY_COMPLETED', 'FAILED', 'WAITING_FOR_APPROVAL', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  PARTIALLY_COMPLETED: [], // Terminal state
  FAILED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

export const TERMINAL_STATES: ReadonlySet<MissionState> = new Set([
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export class InvalidStateTransitionError extends Error {
  constructor(public current: MissionState, public next: MissionState) {
    super(`[ProofLoop] Invalid state transition from "${current}" to "${next}".`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class DuplicateExecutionError extends Error {
  constructor(public missionId: string, public state: MissionState) {
    super(`[ProofLoop] Cannot execute mission "${missionId}" — already in state "${state}".`);
    this.name = 'DuplicateExecutionError';
  }
}

export class DuplicateCompletionError extends Error {
  constructor(public missionId: string, public state: MissionState) {
    super(`[ProofLoop] Mission "${missionId}" has already reached terminal completion state "${state}".`);
    this.name = 'DuplicateCompletionError';
  }
}

export function isTerminalState(state: MissionState): boolean {
  return TERMINAL_STATES.has(state);
}

export function canTransition(current: MissionState, next: MissionState): boolean {
  if (current === next) return true; // Idempotent same-state check
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  return allowed.includes(next);
}

export function assertValidTransition(current: MissionState, next: MissionState): void {
  if (current === next) return;
  if (!canTransition(current, next)) {
    throw new InvalidStateTransitionError(current, next);
  }
}

/**
 * Calculates deterministic completion score and verification summary.
 * NEVER awards 100% unless all conditions are VERIFIED.
 */
export function computeVerificationSummary(conditions: MissionCondition[]): VerificationSummary {
  const total = conditions.length;
  if (total === 0) {
    return {
      total: 0,
      verified: 0,
      failed: 0,
      inconclusive: 0,
      notChecked: 0,
      completionScore: 0,
    };
  }

  let verified = 0;
  let failed = 0;
  let inconclusive = 0;
  let notChecked = 0;

  for (const cond of conditions) {
    switch (cond.status) {
      case 'VERIFIED':
        verified++;
        break;
      case 'FAILED':
        failed++;
        break;
      case 'INCONCLUSIVE':
        inconclusive++;
        break;
      case 'NOT_CHECKED':
      default:
        notChecked++;
        break;
    }
  }

  // Base score solely on verified conditions
  const completionScore = Math.round((verified / total) * 100);

  return {
    total,
    verified,
    failed,
    inconclusive,
    notChecked,
    completionScore,
  };
}

/**
 * Determines the target completion state based on verified conditions and criticality.
 */
export function resolveCompletionState(conditions: MissionCondition[]): 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED' {
  if (conditions.length === 0) return 'FAILED';

  const hasCriticalFailure = conditions.some((c) => c.isCritical && c.status === 'FAILED');
  if (hasCriticalFailure) {
    return 'FAILED';
  }

  const allVerified = conditions.every((c) => c.status === 'VERIFIED');
  if (allVerified) {
    return 'COMPLETED';
  }

  const anyVerified = conditions.some((c) => c.status === 'VERIFIED');
  if (anyVerified) {
    return 'PARTIALLY_COMPLETED';
  }

  return 'FAILED';
}
