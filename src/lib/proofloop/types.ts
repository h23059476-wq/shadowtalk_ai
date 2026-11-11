/**
 * ShadowTalk ProofLoop — Core Types & Data Contracts
 *
 * ProofLoop is an AI execution verification system:
 * "ShadowTalk doesn't just tell you it completed a task. It shows you evidence of what it actually accomplished."
 */

export type MissionState =
  | 'DRAFT'
  | 'READY'
  | 'RUNNING'
  | 'WAITING_FOR_APPROVAL'
  | 'VERIFYING'
  | 'RECOVERING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ConditionStatus =
  | 'NOT_CHECKED'
  | 'VERIFIED'
  | 'FAILED'
  | 'INCONCLUSIVE';

export type ConditionType =
  | 'file_exists'
  | 'data_schema'
  | 'row_count'
  | 'item_count_in_document'
  | 'citation_verified'
  | 'document_structure'
  | 'web_resource'
  | 'code_execution'
  | 'custom_check';

export type EvidenceType =
  | 'file_artifact'
  | 'dataset_inspection'
  | 'web_source'
  | 'code_output'
  | 'system_check';

export type VerificationMethod =
  | 'deterministic_check'
  | 'content_inspection'
  | 'citation_check'
  | 'schema_validation'
  | 'independent_fetch';

export interface ProofEvidence {
  id: string;
  conditionId: string;
  type: EvidenceType;
  source: string;
  isIndependent: boolean;
  timestamp: string;
  summary: string;
  details: {
    inspectedItem: string;
    expected: any;
    actual: any;
    rawSample?: string;
    hashOrSize?: string;
    metadata?: Record<string, any>;
  };
}

export interface MissionCondition {
  id: string;
  description: string;
  type: ConditionType;
  params: Record<string, any>;
  status: ConditionStatus;
  isCritical: boolean;
  verificationMethod: VerificationMethod;
  verifiedAt?: string;
  evidenceIds: string[];
  failureReason?: string;
  recoveryHint?: string;
}

export interface MissionStep {
  id: string;
  title: string;
  action: string;
  tool?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  params?: Record<string, any>;
  output?: any;
  error?: string;
  durationMs?: number;
  requiresApproval?: boolean;
  consequentialType?: ConsequentialActionType;
}

export type ConsequentialActionType =
  | 'send_communication'
  | 'spend_money'
  | 'publish_content'
  | 'data_mutation'
  | 'external_form_submit'
  | 'private_file_share'
  | 'irreversible_system_action';

export interface ApprovalRequest {
  id: string;
  missionId: string;
  stepId: string;
  actionType: ConsequentialActionType;
  title: string;
  reason: string;
  dataToShare?: any;
  externalSystem: string;
  isReversible: boolean;
  params: Record<string, any>;
  paramsHash: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
  approvedBy?: string;
}

export interface RecoveryAttempt {
  id: string;
  conditionId: string;
  attemptNumber: number;
  maxAttempts: number;
  strategy: string;
  status: 'running' | 'succeeded' | 'failed';
  details: string;
  timestamp: string;
}

export interface VerificationSummary {
  total: number;
  verified: number;
  failed: number;
  inconclusive: number;
  notChecked: number;
  completionScore: number; // 0 to 100 based on verified conditions
}

export interface ProofLoopMission {
  id: string;
  user_id: string;
  title: string;
  userRequest: string;
  objective: string;
  state: MissionState;
  conditions: MissionCondition[];
  steps: MissionStep[];
  evidence: ProofEvidence[];
  approvals: ApprovalRequest[];
  recoveryAttempts: RecoveryAttempt[];
  currentStepIndex: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  verificationSummary: VerificationSummary;
  failureReason?: string;
  isInterrupted?: boolean;
  shareId?: string;
  // Metadata for storage & compatibility with agent_tasks
  type: 'proofloop_mission';
  executor_device_id?: string;
  updatedAt?: string;
}

export interface PublicProofCard {
  id: string;
  missionId: string;
  /** Non-sensitive display title of the mission (never the raw private user prompt). */
  missionTitle: string;
  title: string;
  objectiveSummary: string;
  completedAt: string;
  durationMs: number;
  verificationSummary: {
    total: number;
    verified: number;
    inconclusive: number;
    failed: number;
    completionScore: number;
  };
  verifiedConditions: Array<{
    id: string;
    description: string;
    verificationMethod: string;
    isIndependent: boolean;
  }>;
  evidenceItems: Array<{
    id: string;
    summary: string;
    type: EvidenceType;
    source: string;
    isIndependent: boolean;
    timestamp: string;
  }>;
  /** Number of automated recovery cycles executed during the mission (trust transparency). */
  recoveryAttemptsCount: number;
  auditHash: string;
  issuer: 'ShadowTalk ProofLoop Engine v1.0';
  canonicalUrl: string;
}
