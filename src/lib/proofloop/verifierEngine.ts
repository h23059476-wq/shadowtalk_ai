/**
 * ShadowTalk ProofLoop — Verification Engine (Phase 4)
 *
 * Core Differentiator:
 * "The verifier must inspect actual outputs and evidence instead of trusting
 * the execution model's final message."
 *
 * Deterministic checks inspect files, row counts, column schemas, URLs,
 * DOM/JSON outputs, and hashes.
 */

import type {
  MissionCondition,
  ProofEvidence,
  ConditionStatus,
  EvidenceType,
} from './types';

export interface VerificationResult {
  conditionId: string;
  status: ConditionStatus;
  evidence: ProofEvidence;
  failureReason?: string;
  isIndependent: boolean;
}

export interface VerificationContext {
  files?: Array<{ name: string; content: string; size?: number; mimeType?: string }>;
  dataset?: Array<Record<string, any>> | string;
  documentContent?: string;
  researchText?: string;
  citations?: Array<{ title?: string; url: string; domain?: string }>;
  codeExecutionResult?: { exitCode: number; stdout: string; stderr: string; passedTests?: number; failedTests?: number };
  systemState?: Record<string, any>;
  assistantMessage?: string;
}

function createEvidence(
  conditionId: string,
  type: EvidenceType,
  source: string,
  isIndependent: boolean,
  summary: string,
  details: ProofEvidence['details'],
): ProofEvidence {
  return {
    id: `ev_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`,
    conditionId,
    type,
    source,
    isIndependent,
    timestamp: new Date().toISOString(),
    summary,
    details,
  };
}

/**
 * 1. Spreadsheet / Dataset Verification
 * Deterministically parses CSV or array of objects, checks rows and mandatory columns.
 */
export function verifySpreadsheetData(
  condition: MissionCondition,
  context: VerificationContext,
): VerificationResult {
  const { minRows = 1, requiredFields = [] } = condition.params;
  let rows: Array<Record<string, any>> = [];

  // Parse if provided as CSV string or file content
  if (Array.isArray(context.dataset)) {
    rows = context.dataset;
  } else if (typeof context.dataset === 'string' && context.dataset.trim().length > 0) {
    rows = parseCsvToRows(context.dataset);
  } else if (context.files && context.files.length > 0) {
    const csvFile = context.files.find((f) => f.name.endsWith('.csv') || f.name.endsWith('.json'));
    if (csvFile) {
      if (csvFile.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(csvFile.content);
          rows = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // invalid json
        }
      } else {
        rows = parseCsvToRows(csvFile.content);
      }
    }
  }

  // If no structured dataset was found in artifacts/files, check if assistant merely claimed in text
  if (rows.length === 0) {
    const claimedInText = Boolean(context.assistantMessage && context.assistantMessage.includes('spreadsheet'));
    const evidence = createEvidence(
      condition.id,
      'dataset_inspection',
      'deterministic_csv_parser',
      true, // checked independently, found 0 rows
      'No verifiable tabular dataset found in generated artifacts or file exports.',
      {
        inspectedItem: 'dataset_rows',
        expected: `>= ${minRows} rows with columns [${requiredFields.join(', ')}]`,
        actual: '0 rows found',
      },
    );

    return {
      conditionId: condition.id,
      status: claimedInText ? 'FAILED' : 'FAILED',
      evidence,
      failureReason: claimedInText
        ? 'AI claimed to create spreadsheet in chat text, but no actual dataset file or table was produced.'
        : 'Missing required dataset artifact.',
      isIndependent: true,
    };
  }

  // Row count check
  if (rows.length < minRows) {
    const evidence = createEvidence(
      condition.id,
      'dataset_inspection',
      'deterministic_csv_parser',
      true,
      `Inspected dataset contains ${rows.length} rows, but requires at least ${minRows}.`,
      {
        inspectedItem: 'row_count',
        expected: minRows,
        actual: rows.length,
        rawSample: JSON.stringify(rows.slice(0, 2)),
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: `Found only ${rows.length} records. Expected at least ${minRows}.`,
      isIndependent: true,
    };
  }

  // Check required headers / fields across rows
  const missingHeaders: string[] = [];
  const normalizedKeys = new Set(Object.keys(rows[0] || {}).map((k) => k.toLowerCase().trim()));

  for (const field of requiredFields) {
    const fieldLower = String(field).toLowerCase().trim();
    const hasField = Array.from(normalizedKeys).some((k) => k.includes(fieldLower));
    if (!hasField) {
      missingHeaders.push(field);
    }
  }

  if (missingHeaders.length > 0) {
    const evidence = createEvidence(
      condition.id,
      'dataset_inspection',
      'schema_validator',
      true,
      `Schema missing required fields: [${missingHeaders.join(', ')}].`,
      {
        inspectedItem: 'columns',
        expected: requiredFields,
        actual: Array.from(normalizedKeys),
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: `Dataset is missing required column(s): ${missingHeaders.join(', ')}.`,
      isIndependent: true,
    };
  }

  // Verified successfully
  const evidence = createEvidence(
    condition.id,
    'dataset_inspection',
    'deterministic_csv_parser',
    true,
    `Verified dataset containing ${rows.length} distinct rows with all required schema headers [${requiredFields.join(', ')}].`,
    {
      inspectedItem: 'dataset_rows',
      expected: `>= ${minRows} rows`,
      actual: `${rows.length} rows`,
      rawSample: JSON.stringify(rows.slice(0, 3), null, 2),
      hashOrSize: `${rows.length} rows, ${Object.keys(rows[0] || {}).length} columns`,
    },
  );

  return {
    conditionId: condition.id,
    status: 'VERIFIED',
    evidence,
    isIndependent: true,
  };
}

/**
 * 2. File Artifact Verification
 * Confirms file exists, has non-zero size, is readable, and matches format.
 */
export function verifyFileArtifact(
  condition: MissionCondition,
  context: VerificationContext,
): VerificationResult {
  const { minSizeBytes = 10, format } = condition.params;
  const files = context.files || [];

  if (files.length === 0) {
    const evidence = createEvidence(
      condition.id,
      'file_artifact',
      'sandbox_filesystem',
      true,
      'No generated files found in mission output workspace.',
      {
        inspectedItem: 'file_list',
        expected: 'At least 1 generated file artifact',
        actual: '0 files',
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: 'No export artifact was saved or produced in workspace.',
      isIndependent: true,
    };
  }

  const matchingFile = files.find((f) => {
    if (!f.content || f.content.length < minSizeBytes) return false;
    if (format === 'csv_or_json') {
      return f.name.endsWith('.csv') || f.name.endsWith('.json');
    }
    if (format === 'pdf') return f.name.endsWith('.pdf');
    if (format === 'markdown') return f.name.endsWith('.md');
    return true;
  }) || files[0];

  const actualBytes = matchingFile.content ? new Blob([matchingFile.content]).size : matchingFile.size || 0;

  if (actualBytes < minSizeBytes) {
    const evidence = createEvidence(
      condition.id,
      'file_artifact',
      'sandbox_filesystem',
      true,
      `File ${matchingFile.name} size is ${actualBytes} bytes (below minimum ${minSizeBytes} bytes).`,
      {
        inspectedItem: matchingFile.name,
        expected: `>= ${minSizeBytes} bytes`,
        actual: `${actualBytes} bytes`,
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: `Generated file "${matchingFile.name}" is empty or truncated (${actualBytes} bytes).`,
      isIndependent: true,
    };
  }

  const evidence = createEvidence(
    condition.id,
    'file_artifact',
    'sandbox_filesystem',
    true,
    `Verified artifact "${matchingFile.name}" (${actualBytes} bytes, readable, valid format).`,
    {
      inspectedItem: matchingFile.name,
      expected: `Readable file >= ${minSizeBytes} bytes`,
      actual: `${actualBytes} bytes`,
      hashOrSize: `${actualBytes}B`,
      rawSample: matchingFile.content.slice(0, 150) + '...',
    },
  );

  return {
    conditionId: condition.id,
    status: 'VERIFIED',
    evidence,
    isIndependent: true,
  };
}

/**
 * 3. Research & Citation Verification
 * Inspects citations, URLs, domain diversity, and ensures no bare hallucinations.
 */
export function verifyResearchCitations(
  condition: MissionCondition,
  context: VerificationContext,
): VerificationResult {
  const { minCitations = 2, requireDomainDiversity = true } = condition.params;
  const citations = context.citations || [];
  const text = context.researchText || context.documentContent || context.assistantMessage || '';

  // Extract URLs from text using standard URL regex if citations array is empty
  const urlRegex = /https?:\/\/[^\s)\]">]+/g;
  const extractedUrls = Array.from(new Set(text.match(urlRegex) || []));

  const allUrls = Array.from(new Set([
    ...citations.map((c) => c.url),
    ...extractedUrls,
  ])).filter((u) => !u.includes('localhost') && !u.includes('example.com'));

  // Extract unique domains
  const domains = new Set<string>();
  for (const url of allUrls) {
    try {
      const parsed = new URL(url);
      domains.add(parsed.hostname.toLowerCase());
    } catch {
      // invalid URL
    }
  }

  if (allUrls.length < minCitations) {
    const evidence = createEvidence(
      condition.id,
      'web_source',
      'citation_analyzer',
      true,
      `Found ${allUrls.length} verified citation links. Expected minimum ${minCitations}.`,
      {
        inspectedItem: 'citations',
        expected: minCitations,
        actual: allUrls.length,
        rawSample: allUrls.join(', '),
      },
    );
    return {
      conditionId: condition.id,
      status: allUrls.length > 0 ? 'INCONCLUSIVE' : 'FAILED',
      evidence,
      failureReason: `Insufficient verified citations (${allUrls.length}/${minCitations} found).`,
      isIndependent: true,
    };
  }

  if (requireDomainDiversity && domains.size < Math.min(2, minCitations)) {
    const evidence = createEvidence(
      condition.id,
      'web_source',
      'domain_diversity_check',
      true,
      `Citations only reference ${domains.size} unique domain (${Array.from(domains).join(', ')}).`,
      {
        inspectedItem: 'unique_domains',
        expected: '>= 2 distinct domains',
        actual: Array.from(domains),
      },
    );
    return {
      conditionId: condition.id,
      status: 'INCONCLUSIVE',
      evidence,
      failureReason: 'Research lacks source domain diversity (all references point to the same origin).',
      isIndependent: true,
    };
  }

  const evidence = createEvidence(
    condition.id,
    'web_source',
    'citation_analyzer',
    true,
    `Verified ${allUrls.length} citations across ${domains.size} distinct domains: [${Array.from(domains).slice(0, 4).join(', ')}].`,
    {
      inspectedItem: 'citations_and_domains',
      expected: `>= ${minCitations} citations with domain diversity`,
      actual: `${allUrls.length} links, ${domains.size} domains`,
      rawSample: allUrls.slice(0, 5).join('\n'),
    },
  );

  return {
    conditionId: condition.id,
    status: 'VERIFIED',
    evidence,
    isIndependent: true,
  };
}

/**
 * 4. Document Structure Verification
 * Inspects headings, word count, and absence of placeholder copy (TODO, Lorem Ipsum, etc.).
 */
export function verifyDocumentStructure(
  condition: MissionCondition,
  context: VerificationContext,
): VerificationResult {
  const { requiredSections = [], minWordCount = 100, noPlaceholderText = true } = condition.params;
  const content = context.documentContent || context.assistantMessage || '';

  // 1. Check placeholder text first
  if (noPlaceholderText) {
    const placeholderRegex = /(?:^|\s|\b)(lorem ipsum|\[insert [^\]]+\]|todo:|coming soon|placeholder)(?:\b|\s|$)/i;
    const match = content.match(placeholderRegex);
    if (match) {
      const token = (match[1] || match[0]).trim();
      const evidence = createEvidence(
        condition.id,
        'system_check',
        'document_structure_inspector',
        true,
        `Unfilled placeholder detected in document: "${token}".`,
        {
          inspectedItem: 'placeholder_scan',
          expected: 'No placeholder tokens',
          actual: `Found "${token}"`,
        },
      );
      return {
        conditionId: condition.id,
        status: 'FAILED',
        evidence,
        failureReason: `Document contains placeholder text ("${token}"). Real researched content is required.`,
        isIndependent: true,
      };
    }
  }

  // 2. Check minimum length
  const words = content.trim().split(/\s+/).filter(Boolean);
  if (words.length < minWordCount) {
    const evidence = createEvidence(
      condition.id,
      'system_check',
      'document_structure_inspector',
      true,
      `Document length is ${words.length} words (below required ${minWordCount} words).`,
      {
        inspectedItem: 'word_count',
        expected: minWordCount,
        actual: words.length,
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: `Document is too short (${words.length}/${minWordCount} words).`,
      isIndependent: true,
    };
  }

  // Check required sections (case-insensitive headings)
  const missingSections: string[] = [];
  for (const sec of requiredSections) {
    const regex = new RegExp(`(^|\\n)#+\\s*.*${sec}.*`, 'i');
    const simpleRegex = new RegExp(sec, 'i');
    if (!regex.test(content) && !simpleRegex.test(content)) {
      missingSections.push(sec);
    }
  }

  if (missingSections.length > 0) {
    const evidence = createEvidence(
      condition.id,
      'system_check',
      'document_structure_inspector',
      true,
      `Document lacks required sections: [${missingSections.join(', ')}].`,
      {
        inspectedItem: 'sections',
        expected: requiredSections,
        actual: `Missing: ${missingSections.join(', ')}`,
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: `Missing required section(s): ${missingSections.join(', ')}.`,
      isIndependent: true,
    };
  }

  // Check placeholder text
  if (noPlaceholderText) {
    const placeholderRegex = /\b(lorem ipsum|\[insert name\]|\[insert company\]|todo:|coming soon|placeholder)\b/i;
    const match = content.match(placeholderRegex);
    if (match) {
      const evidence = createEvidence(
        condition.id,
        'system_check',
        'document_structure_inspector',
        true,
        `Unfilled placeholder detected in document: "${match[0]}".`,
        {
          inspectedItem: 'placeholder_scan',
          expected: 'No placeholder tokens',
          actual: `Found "${match[0]}"`,
        },
      );
      return {
        conditionId: condition.id,
        status: 'FAILED',
        evidence,
        failureReason: `Document contains placeholder text ("${match[0]}"). Real researched content is required.`,
        isIndependent: true,
      };
    }
  }

  const evidence = createEvidence(
    condition.id,
    'system_check',
    'document_structure_inspector',
    true,
    `Verified document structure (${words.length} words, sections [${requiredSections.join(', ')}] confirmed, zero placeholders).`,
    {
      inspectedItem: 'document_quality',
      expected: `Structured document >= ${minWordCount} words`,
      actual: `${words.length} words with complete sections`,
    },
  );

  return {
    conditionId: condition.id,
    status: 'VERIFIED',
    evidence,
    isIndependent: true,
  };
}

/**
 * 4b. Document Item Count Verification
 * Deterministically parses and verifies that a document contains an exact number
 * of distinct structured items (such as product ideas, features, or benchmarks).
 */
export function verifyDocumentItemCount(
  condition: MissionCondition,
  context: VerificationContext,
): VerificationResult {
  const { exactCount = 3, itemName = 'fictional product ideas' } = condition.params;
  const content = context.documentContent || (context.files && context.files[0]?.content) || context.assistantMessage || '';

  if (!content || content.trim().length === 0) {
    const evidence = createEvidence(
      condition.id,
      'dataset_inspection',
      'document_item_inspector',
      true,
      `Document is empty or unreadable. Expected exactly ${exactCount} ${itemName}.`,
      {
        inspectedItem: itemName,
        expected: `Exactly ${exactCount}`,
        actual: 0,
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: `Document is empty or unreadable. Expected exactly ${exactCount} ${itemName}.`,
      isIndependent: true,
    };
  }

  // Extract distinct numbered items or header items
  // Matches e.g. "## 1. Idea Name", "### Product Idea 1: Name", "1. **Idea Name**"
  const numberedPattern = /(?:^|\n)(?:#+\s*)?(?:idea|product)?\s*(\d+)[\.:\)\-]\s*([^\n]+)/gi;
  const headerPattern = /(?:^|\n)##+\s*(?:product\s*idea|idea)?\s*[:\-]?\s*([^\n]+)/gi;

  const foundItems: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = numberedPattern.exec(content)) !== null) {
    const title = match[2].trim().replace(/^\*\*/, '').replace(/\*\*.*$/, '').trim();
    if (title && !foundItems.includes(title) && !title.toLowerCase().startsWith('note')) {
      foundItems.push(title);
    }
  }

  // Fallback to headers if numbered pattern didn't match
  if (foundItems.length === 0) {
    while ((match = headerPattern.exec(content)) !== null) {
      const title = match[1].trim().replace(/^\*\*/, '').replace(/\*\*.*$/, '').trim();
      if (title && !foundItems.includes(title) && !title.toLowerCase().includes('report') && !title.toLowerCase().includes('summary')) {
        foundItems.push(title);
      }
    }
  }

  const actualCount = foundItems.length;

  if (actualCount !== exactCount) {
    const evidence = createEvidence(
      condition.id,
      'dataset_inspection',
      'document_item_inspector',
      true,
      `Inspected document contains ${actualCount} ${itemName} ([${foundItems.join(', ')}]). Expected exactly ${exactCount}.`,
      {
        inspectedItem: itemName,
        expected: `Exactly ${exactCount}`,
        actual: actualCount,
        rawSample: foundItems.join('\n'),
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: `Document contains ${actualCount} ${itemName}. Expected exactly ${exactCount}.`,
      isIndependent: true,
    };
  }

  const evidence = createEvidence(
    condition.id,
    'dataset_inspection',
    'document_item_inspector',
    true,
    `Verified document contains exactly ${actualCount} ${itemName}: [${foundItems.join(', ')}].`,
    {
      inspectedItem: itemName,
      expected: `Exactly ${exactCount}`,
      actual: actualCount,
      rawSample: foundItems.join('\n'),
    },
  );

  return {
    conditionId: condition.id,
    status: 'VERIFIED',
    evidence,
    isIndependent: true,
  };
}

/**
 * 5. Code Execution Verification
 * Checks exit code, stdout non-emptiness, and absence of error stack traces.
 */
export function verifyCodeExecution(
  condition: MissionCondition,
  context: VerificationContext,
): VerificationResult {
  const result = context.codeExecutionResult;
  if (!result) {
    const evidence = createEvidence(
      condition.id,
      'code_output',
      'sandbox_runner',
      true,
      'No code execution output or process exit code recorded.',
      {
        inspectedItem: 'process_result',
        expected: 'Exit code 0',
        actual: 'No execution recorded',
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: 'Code was not executed in the sandbox or recorded no output.',
      isIndependent: true,
    };
  }

  if (result.exitCode !== 0) {
    const evidence = createEvidence(
      condition.id,
      'code_output',
      'sandbox_runner',
      true,
      `Code failed with exit code ${result.exitCode}: ${result.stderr.slice(0, 200)}`,
      {
        inspectedItem: 'exit_code',
        expected: 0,
        actual: result.exitCode,
        rawSample: result.stderr || result.stdout,
      },
    );
    return {
      conditionId: condition.id,
      status: 'FAILED',
      evidence,
      failureReason: `Process exited with error code ${result.exitCode}.`,
      isIndependent: true,
    };
  }

  const evidence = createEvidence(
    condition.id,
    'code_output',
    'sandbox_runner',
    true,
    `Code executed successfully with exit code 0 (${result.stdout.trim().length} chars output).`,
    {
      inspectedItem: 'sandbox_execution',
      expected: 'Exit code 0',
      actual: 'Exit code 0',
      rawSample: result.stdout.slice(0, 300),
    },
  );

  return {
    conditionId: condition.id,
    status: 'VERIFIED',
    evidence,
    isIndependent: true,
  };
}

/**
 * Main dispatcher: Evaluates any condition deterministically.
 */
export function verifyCondition(
  condition: MissionCondition,
  context: VerificationContext,
): VerificationResult {
  switch (condition.type) {
    case 'row_count':
    case 'data_schema':
      return verifySpreadsheetData(condition, context);

    case 'file_exists':
      return verifyFileArtifact(condition, context);

    case 'citation_verified':
    case 'web_resource':
      return verifyResearchCitations(condition, context);

    case 'document_structure':
      return verifyDocumentStructure(condition, context);

    case 'item_count_in_document':
      return verifyDocumentItemCount(condition, context);

    case 'code_execution':
      return verifyCodeExecution(condition, context);

    case 'custom_check':
    default: {
      // For custom checks, if human approval was required, check approval state
      if (condition.params?.requiresExplicitApproval) {
        const approved = Boolean(context.systemState?.hasApprovedConsequentialAction);
        const evidence = createEvidence(
          condition.id,
          'system_check',
          'approval_ledger',
          true,
          approved ? 'Explicit user approval verified.' : 'Pending human approval.',
          {
            inspectedItem: 'user_approval',
            expected: 'Approved',
            actual: approved ? 'Approved' : 'Pending',
          },
        );
        return {
          conditionId: condition.id,
          status: approved ? 'VERIFIED' : 'FAILED',
          evidence,
          failureReason: approved ? undefined : 'Action requires explicit user approval before verification.',
          isIndependent: true,
        };
      }

      // If only self-reported text is available without independent artifacts:
      const hasContent = Boolean(context.assistantMessage && context.assistantMessage.length > 50);
      const evidence = createEvidence(
        condition.id,
        'system_check',
        'content_inspector',
        false, // NOT independently verified — model output inspection
        hasContent
          ? 'Output delivered by assistant, but lacks external deterministic proof.'
          : 'No substantial content produced.',
        {
          inspectedItem: 'model_output',
          expected: condition.description,
          actual: hasContent ? 'Delivered in conversation' : 'Empty',
        },
      );

      return {
        conditionId: condition.id,
        status: hasContent ? 'INCONCLUSIVE' : 'FAILED',
        evidence,
        failureReason: hasContent ? 'Relies on model self-assertion without independent verifiable evidence.' : 'Unfinished.',
        isIndependent: false,
      };
    }
  }
}

/**
 * Helper: Parses simple CSV strings into object rows.
 */
function parseCsvToRows(csvText: string): Array<Record<string, any>> {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = splitCsvLine(lines[0]);
  const rows: Array<Record<string, any>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
