/**
 * ShadowTalk Intelligence Center - Domain Types
 * Native Founder & Product Analytics Data Contracts
 */

export type TimeRange = '24h' | '7d' | '30d' | '90d' | 'all';
export type ComparisonPeriod = 'previous_period' | 'previous_year' | 'none';

export type DashboardView =
  | 'command-center'
  | 'user-intelligence'
  | 'mission-analytics'
  | 'ai-intelligence'
  | 'cost-intelligence'
  | 'growth-intelligence'
  | 'performance'
  | 'privacy-security'
  | 'reports';

export interface MetricDelta {
  value: number;
  percentage: number;
  isPositive: boolean;
  periodLabel: string;
}

export interface MetricValue {
  current: number;
  formatted: string;
  delta?: MetricDelta;
  benchmark?: string;
  isEstimated?: boolean;
  confidence?: number;
}

// 1. Command Center Data Contract
export interface CommandOverviewData {
  dailyActiveUsers: MetricValue;
  weeklyActiveUsers: MetricValue;
  monthlyActiveUsers: MetricValue;
  newUsers: MetricValue;
  totalSessions: MetricValue;
  activationRate: MetricValue;
  missionCompletionRate: MetricValue;
  medianTimeToFirstValueSec: MetricValue;
  
  // Charts
  userActivityTrend: {
    label: string;
    dau: number;
    wau: number;
    sessions: number;
  }[];
  newVsReturningTrend: {
    label: string;
    newUsers: number;
    returningUsers: number;
  }[];
  missionCompletionTrend: {
    label: string;
    completed: number;
    failed: number;
    started: number;
  }[];
  activationFunnel: {
    stage: string;
    users: number;
    conversionRate: number;
    dropoffRate: number;
  }[];
  providerDistribution: {
    provider: string;
    share: number;
    requests: number;
    color: string;
  }[];
  recentEvents: {
    id: string;
    timestamp: string;
    category: 'mission' | 'provider' | 'schema' | 'security' | 'gateway';
    title: string;
    severity: 'nominal' | 'info' | 'warning' | 'critical';
    meta: string;
  }[];
}

// 2. User Intelligence Data Contract
export interface CohortRow {
  cohortDate: string;
  cohortSize: number;
  retention: (number | null)[];
}

export interface UserIntelligenceData {
  signupConversionRate: MetricValue;
  activationRate: MetricValue;
  returningUsersCount: MetricValue;
  secondMissionConversionRate: MetricValue;
  signupToFirstValueRate: MetricValue;
  userJourneyFunnel: {
    step: string;
    count: number;
    rate: number;
    description: string;
  }[];
  returningUserTrend: {
    label: string;
    dailyReturning: number;
    weeklyReturning: number;
  }[];
  cohortRetention: {
    weeks: string[];
    rows: CohortRow[];
  };
  userSegments: {
    segment: string;
    count: number;
    percentage: number;
    avgMissionsPerWeek: number;
  }[];
}

// 3. Mission Analytics Data Contract
export interface FailureCategory {
  reason: string;
  count: number;
  percentage: number;
  category: 'provider_timeout' | 'context_exhausted' | 'rate_limit' | 'tool_invocation' | 'user_abort';
}

export interface ResponseTypeDistribution {
  type: string;
  count: number;
  percentage: number;
  avgDurationSec: number;
  medianTokens: number;
}

export type SimulationState =
  | 'normal'
  | 'traffic-surge'
  | 'provider-incident'
  | 'loading'
  | 'empty'
  | 'error';

export interface MissionAnalyticsData {
  missionsStarted: MetricValue;
  missionsCompleted: MetricValue;
  missionsFailed: MetricValue;
  completionPercentage: MetricValue;
  completionRate?: MetricValue;
  medianTTFVSec: MetricValue;
  averageTTFVSec: MetricValue;
  failureCategories: FailureCategory[];
  failureBreakdown?: FailureCategory[];
  responseTypes: ResponseTypeDistribution[];
  durationBuckets: {
    bucket: string;
    count: number;
  }[];
  durationDistribution?: {
    bucket: string;
    count: number;
  }[];
}

// 4. AI Intelligence Data Contract
export interface ProviderUsage {
  provider: 'Google Gemini' | 'Anthropic' | 'OpenAI' | 'Groq' | 'Mistral' | 'Self-Hosted/Ollama';
  requests: number;
  percentage: number;
  avgLatencyMs: number;
  successRate: number;
  activeKeys: number;
}

export interface ModelRankingItem {
  modelId: string;
  provider: string;
  requests: number;
  tokensTotal: number;
  successfulRequests: number;
  failedRequests: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  successRate: number;
  isKnownPricing: boolean;
}

export interface AiIntelligenceData {
  totalRequests: MetricValue;
  overallSuccessRate: MetricValue;
  averageLatencyMs: MetricValue;
  unknownModelCount: MetricValue;
  providers: ProviderUsage[];
  models: ModelRankingItem[];
  requestsByModelChart: {
    model: string;
    success: number;
    failed: number;
  }[];
  latencyTrend: {
    timestamp: string;
    p50: number;
    p95: number;
    p99: number;
  }[];
}

// 5. Cost Intelligence Data Contract
export interface CostBreakdownItem {
  provider: string;
  model: string;
  verifiedCost: number;
  estimatedCost: number;
  pricingStatus: 'verified_card' | 'community_estimate' | 'unpriced';
  tokensProcessed: number;
}

export interface CostIntelligenceData {
  verifiedCost: MetricValue;
  estimatedCost: MetricValue;
  unavailablePricing: MetricValue;
  pricingCoverageRate: MetricValue;
  unitCostPerMission: MetricValue;
  dailyCostTrend: {
    date: string;
    verifiedCost: number;
    estimatedCost: number;
  }[];
  breakdown: CostBreakdownItem[];
}

// 6. Growth Intelligence Data Contract
export interface TrafficChannel {
  channel: string;
  visitors: number;
  signups: number;
  conversionRate: number;
  bounceRate: number;
}

export interface LandingPagePerformance {
  path: string;
  impressions: number;
  workspacesCreated: number;
  activationPct: number;
}

export interface GrowthIntelligenceData {
  organicTrafficRate: MetricValue;
  referralTrafficRate: MetricValue;
  overallSignupConversion: MetricValue;
  activeWorkspacesCreated: MetricValue;
  trafficChannels: TrafficChannel[];
  topLandingPages: LandingPagePerformance[];
  signupConversionTrend: {
    week: string;
    organic: number;
    referral: number;
    direct: number;
  }[];
}

// 7. Performance Data Contract
export interface PerformanceData {
  errorRate: MetricValue;
  eventDeliveryFailureRate: MetricValue;
  medianResponseLatencyMs: MetricValue;
  p99ResponseLatencyMs: MetricValue;
  analyticsDataQualityScore: MetricValue;
  missionFailureTrend: {
    time: string;
    rateLimits: number;
    timeouts: number;
    contextOverflow: number;
    aborts: number;
  }[];
  serviceHealth: {
    service: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    uptimePct: number;
  }[];
  errorLogCategories: {
    code: string;
    module: string;
    occurrences: number;
    lastSeen: string;
    impact: 'low' | 'medium' | 'high';
  }[];
}

// 8. Privacy & Security Data Contract
export interface PrivacySecurityData {
  consentStatusOverview: MetricValue;
  analyticsCollectionStatus: 'ACTIVE_ZERO_PII' | 'PAUSED' | 'AUDIT_MODE';
  eventValidationStatus: MetricValue;
  dataMinimizationScore: MetricValue;
  adminAccessStatus: MetricValue;
  consentBreakdown: {
    tier: string;
    userCount: number;
    percentage: number;
  }[];
  governanceChecks: {
    checkName: string;
    status: 'pass' | 'warning' | 'fail';
    description: string;
    lastAudited: string;
  }[];
  adminAuditLog: {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    ipHash: string;
    status: 'allowed' | 'challenge' | 'blocked';
  }[];
}

// 9. Reports Data Contract
export interface GeneratedReport {
  id: string;
  name: string;
  dateRange: TimeRange;
  comparison: ComparisonPeriod;
  createdAt: string;
  format: 'csv' | 'json' | 'pdf_digest';
  fileSize: string;
  metricsIncluded: string[];
}

export interface ReportsData {
  savedReports: GeneratedReport[];
  metricSummaries: {
    category: string;
    metric: string;
    currentValue: string;
    previousValue: string;
    deltaPercentage: number;
    direction: 'up' | 'down' | 'neutral';
  }[];
}

// Live Ingestion Telemetry Event Interface
export interface TelemetryIngestEvent {
  eventType: 'mission_completed' | 'mission_failed' | 'user_activated' | 'model_called';
  provider: 'Google Gemini' | 'Anthropic' | 'OpenAI' | 'Groq' | 'Mistral';
  modelId: string;
  tokensTotal: number;
  durationMs: number;
  success: boolean;
  timestamp?: number;
}

// Full Dashboard Dataset
export interface IntelligenceDataset {
  overview: CommandOverviewData;
  userIntelligence: UserIntelligenceData;
  missionAnalytics: MissionAnalyticsData;
  aiIntelligence: AiIntelligenceData;
  costIntelligence: CostIntelligenceData;
  growthIntelligence: GrowthIntelligenceData;
  performance: PerformanceData;
  privacySecurity: PrivacySecurityData;
  reports: ReportsData;
  meta: {
    generatedAt: string;
    timeRange: TimeRange;
    comparison: ComparisonPeriod;
    environment: 'production' | 'staging' | 'live_telemetry';
    zeroContentGuarantee: boolean;
    totalIngestedEvents: number;
  };
}
