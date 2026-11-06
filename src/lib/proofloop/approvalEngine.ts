/**
 * ShadowTalk ProofLoop — Human Approval & Consequential Action Guard (Phase 6)
 *
 * Implements strict approval gates for any action that affects external systems,
 * communicates with people, modifies persistent data, or spends money.
 *
 * "Approval must be bound to the exact action and its parameters. Changes to an
 * approved action must require renewed approval."
 */

import type { ApprovalRequest, ConsequentialActionType } from './types';

export const CONSEQUENTIAL_ACTIONS: Record<
  ConsequentialActionType,
  { label: string; defaultReversible: boolean; riskLevel: 'low' | 'medium' | 'high' | 'critical' }
> = {
  send_communication: {
    label: 'Send External Message / Email',
    defaultReversible: false,
    riskLevel: 'high',
  },
  spend_money: {
    label: 'Financial Transaction / Payment',
    defaultReversible: false,
    riskLevel: 'critical',
  },
  publish_content: {
    label: 'Publish Public Content',
    defaultReversible: true,
    riskLevel: 'medium',
  },
  data_mutation: {
    label: 'Delete or Overwrite Stored Data',
    defaultReversible: false,
    riskLevel: 'high',
  },
  external_form_submit: {
    label: 'Submit External Form / Web Request',
    defaultReversible: false,
    riskLevel: 'medium',
  },
  private_file_share: {
    label: 'Transmit Private / Sensitive File',
    defaultReversible: false,
    riskLevel: 'high',
  },
  irreversible_system_action: {
    label: 'Irreversible System Modification',
    defaultReversible: false,
    riskLevel: 'critical',
  },
};

/**
 * Deterministic hash of action parameters to prevent tampering after approval.
 */
export function computeParamsHash(actionType: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort();
  const serialized = JSON.stringify(sortedKeys.map((k) => [k, params[k]]));
  let hash = 0;
  const str = `${actionType}:${serialized}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

export function createApprovalRequest({
  missionId,
  stepId,
  actionType,
  title,
  reason,
  dataToShare,
  externalSystem,
  isReversible,
  params,
}: {
  missionId: string;
  stepId: string;
  actionType: ConsequentialActionType;
  title: string;
  reason: string;
  dataToShare?: any;
  externalSystem: string;
  isReversible?: boolean;
  params: Record<string, any>;
}): ApprovalRequest {
  const meta = CONSEQUENTIAL_ACTIONS[actionType] || { defaultReversible: false };
  return {
    id: `appr_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`,
    missionId,
    stepId,
    actionType,
    title,
    reason,
    dataToShare,
    externalSystem,
    isReversible: isReversible ?? meta.defaultReversible,
    params,
    paramsHash: computeParamsHash(actionType, params),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
}

/**
 * Validates that an approved request matches the exact execution parameters.
 * Throws if parameters were mutated after user approval.
 */
export function verifyApprovalValidity(
  approval: ApprovalRequest,
  currentParams: Record<string, any>,
): { isValid: boolean; reason?: string } {
  if (approval.status !== 'approved') {
    return { isValid: false, reason: 'Action has not been approved by the user.' };
  }

  const currentHash = computeParamsHash(approval.actionType, currentParams);
  if (currentHash !== approval.paramsHash) {
    return {
      isValid: false,
      reason: 'Action parameters changed after approval was granted. Renewed approval required.',
    };
  }

  return { isValid: true };
}
