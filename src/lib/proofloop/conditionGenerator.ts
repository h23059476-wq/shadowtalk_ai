/**
 * ShadowTalk ProofLoop — Completion Condition Generator
 *
 * Converts a user's mission prompt into explicit, measurable, testable completion conditions.
 * Includes deterministic template extraction and validation heuristics.
 */

import type { MissionCondition, ConditionType, VerificationMethod } from './types';

function generateConditionId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface GeneratedMissionPlan {
  title: string;
  objective: string;
  conditions: MissionCondition[];
  suggestedSteps: Array<{
    title: string;
    action: string;
    tool?: string;
    requiresApproval?: boolean;
    consequentialType?: any;
  }>;
}

/**
 * Deterministic rule-based completion condition extractor.
 * Works completely offline or when BYOK is unconfigured.
 */
export function generateConditionsFromPrompt(prompt: string): GeneratedMissionPlan {
  const cleanPrompt = prompt.trim();
  const lower = cleanPrompt.toLowerCase();

  // Extract explicit counts (e.g., "10 businesses", "5 articles", "top 3 competitors")
  const countMatch = lower.match(/\b(\d+)\s+([a-z_-]+)/i);
  const targetCount = countMatch ? parseInt(countMatch[1], 10) : null;
  const targetItemType = countMatch ? countMatch[2] : 'items';

  const isSpreadsheet = /\b(spreadsheet|csv|excel|sheets?|table|rows?|dataset)\b/i.test(lower);
  const isResearch = /\b(research|investigate|analyze|find|sources?|citations?|benchmark)\b/i.test(lower);
  const isDocument = /\b(report|doc|document|pdf|proposal|brief|presentation|slides?)\b/i.test(lower);
  const isCode = /\b(code|script|program|function|api|test|debug|build)\b/i.test(lower);
  const isEmailOrMessage = /\b(email|send|message|contact|outreach|notify)\b/i.test(lower);

  const conditions: MissionCondition[] = [];
  const suggestedSteps: GeneratedMissionPlan['suggestedSteps'] = [];

  // Generate sensible title
  let title = cleanPrompt.length > 60 ? cleanPrompt.slice(0, 57) + '...' : cleanPrompt;
  if (countMatch && (isSpreadsheet || isResearch)) {
    title = `Verify & Collect ${targetCount} ${targetItemType}`;
  } else if (isCode) {
    title = `Develop & Verify ${cleanPrompt.slice(0, 40)}`;
  } else if (isDocument) {
    title = `Generate & Verify ${cleanPrompt.slice(0, 40)}`;
  }

  // 1. Spreadsheet / Dataset conditions
  if (isSpreadsheet) {
    const requiredCols = ['name', 'website'];
    if (lower.includes('contact') || lower.includes('email') || lower.includes('phone')) {
      requiredCols.push('contact');
    }
    if (lower.includes('price') || lower.includes('cost') || lower.includes('fee')) {
      requiredCols.push('pricing');
    }

    if (targetCount && targetCount > 0) {
      conditions.push({
        id: generateConditionId('cond_count'),
        description: `Exactly or at least ${targetCount} distinct verified records collected.`,
        type: 'row_count',
        params: { minRows: targetCount, uniqueKey: 'name' },
        status: 'NOT_CHECKED',
        isCritical: true,
        verificationMethod: 'deterministic_check',
        evidenceIds: [],
        recoveryHint: `Gather remaining ${targetCount} entries with non-empty attributes.`,
      });
    }

    conditions.push({
      id: generateConditionId('cond_schema'),
      description: `Structured data conforms to required schema fields: [${requiredCols.join(', ')}].`,
      type: 'data_schema',
      params: { requiredFields: requiredCols },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'schema_validation',
      evidenceIds: [],
      recoveryHint: 'Re-format output table to include all required headers with verified non-null cells.',
    });

    conditions.push({
      id: generateConditionId('cond_file'),
      description: 'Structured output artifact generated and verified parseable without syntax errors.',
      type: 'file_exists',
      params: { minSizeBytes: 100, format: 'csv_or_json' },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'deterministic_check',
      evidenceIds: [],
    });

    suggestedSteps.push(
      { title: 'Search & Data Aggregation', action: 'Query web and gather data records', tool: 'web_search' },
      { title: 'Data Cleaning & Normalization', action: 'Deduplicate and structure table columns', tool: 'code_executor' },
      { title: 'Generate Structured Artifact', action: 'Export verified CSV/JSON table', tool: 'document_generator' },
    );
  }

  // 2. Research / Citation conditions
  if (isResearch) {
    const minCitations = targetCount ? Math.min(targetCount, 5) : 3;
    conditions.push({
      id: generateConditionId('cond_cite'),
      description: `Minimum of ${minCitations} distinct, reputable source citations provided and validated.`,
      type: 'citation_verified',
      params: { minCitations, requireDomainDiversity: true },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'citation_check',
      evidenceIds: [],
      recoveryHint: 'Identify specific live source URLs for claims lacking reference links.',
    });

    if (!isSpreadsheet) {
      suggestedSteps.push(
        { title: 'Deep Web Research', action: 'Collect primary and secondary sources', tool: 'deep_research' },
        { title: 'Source Verification', action: 'Check claims against source domains', tool: 'web_search' },
      );
    }
  }

  // 3. Document / Report conditions
  if (isDocument) {
    conditions.push({
      id: generateConditionId('cond_doc'),
      description: 'Document structure includes Executive Summary, Detailed Findings, and actionable Conclusion.',
      type: 'document_structure',
      params: {
        requiredSections: ['Executive Summary', 'Findings', 'Conclusion'],
        minWordCount: 250,
        noPlaceholderText: true,
      },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'content_inspection',
      evidenceIds: [],
      recoveryHint: 'Expand missing sections and replace any placeholder markers with researched content.',
    });

    suggestedSteps.push(
      { title: 'Document Synthesis', action: 'Draft professional report with headers and citations', tool: 'document_generator' },
    );
  }

  // 4. Code Execution conditions
  if (isCode) {
    conditions.push({
      id: generateConditionId('cond_code'),
      description: 'Code executes in sandbox with exit code 0 and valid runtime test assertion pass.',
      type: 'code_execution',
      params: { expectedExitCode: 0, testPass: true },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'deterministic_check',
      evidenceIds: [],
      recoveryHint: 'Fix runtime syntax or assertion error and re-run execution.',
    });

    suggestedSteps.push(
      { title: 'Code Implementation', action: 'Write executable script and tests', tool: 'code_executor' },
      { title: 'Sandbox Execution & Test Run', action: 'Execute in isolated sandbox', tool: 'code_executor' },
    );
  }

  // 5. Consequential / Communication conditions & Approval Gates
  if (isEmailOrMessage) {
    suggestedSteps.push({
      title: 'Compose Outreach Communication',
      action: 'Draft message and recipient list for user review',
      tool: 'send_communication',
      requiresApproval: true,
      consequentialType: 'send_communication',
    });

    conditions.push({
      id: generateConditionId('cond_approval'),
      description: 'Explicit human approval obtained before sending any external message.',
      type: 'custom_check',
      params: { requiresExplicitApproval: true },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'deterministic_check',
      evidenceIds: [],
    });
  }

  // Fallback default condition if none triggered
  if (conditions.length === 0) {
    conditions.push({
      id: generateConditionId('cond_default'),
      description: 'Deliverable addresses all criteria in user request with concrete evidence.',
      type: 'custom_check',
      params: { userCriteria: cleanPrompt },
      status: 'NOT_CHECKED',
      isCritical: true,
      verificationMethod: 'content_inspection',
      evidenceIds: [],
    });

    suggestedSteps.push(
      { title: 'Task Execution', action: cleanPrompt, tool: 'strategy_agent' },
      { title: 'Outcome Verification', action: 'Inspect generated deliverables', tool: 'code_executor' },
    );
  }

  return {
    title,
    objective: cleanPrompt,
    conditions,
    suggestedSteps,
  };
}
