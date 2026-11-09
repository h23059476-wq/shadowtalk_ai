import { useCallback } from 'react';

export type ToolType = 
  | 'strategy_agent'
  | 'stealth_vault'
  | 'knowledge_vault'
  | 'memory_panel'
  | 'document_generator'
  | 'presentation_builder'
  | 'calculator'
  | 'web_search'
  | 'deep_research'
  | 'image_generator'
  | 'image_editor'
  | 'image_edit'
  | 'music_generator'
  | 'image_decoder'
  | 'visual_reasoning'
  | 'security_audit'
  | 'shadow_browser'
  | 'shadow_live'
  | 'code_executor'
  | 'code_canvas'
  | 'file_manager'
  | 'database_query'
  | 'analytics_agent'
  | 'api_integrator'
  | 'workflow_automation'
  | 'computer_mode'
  | 'eco_actions'
  | 'sovereign_models'
  | 'cognitive_loop'
  | 'workspace'
  | 'ide'
  | 'marketplace'
  | 'privacy_score'
  | 'referral'
  | 'analytics'
  | 'api_marketplace'
  | 'command_palette'
  | 'executor';

export interface ToolDetectionResult {
  tool: ToolType | null;
  confidence: number;
  action?: string;
  params?: Record<string, string>;
  autoExecute?: boolean;
  originalMessage?: string;
}

const TOOL_PATTERNS: Array<{
  tool: ToolType;
  patterns: RegExp[];
  priority: number;
  autoExecute?: boolean;
  extractParams?: (message: string) => Record<string, string>;
}> = [
  {
    tool: 'calculator',
    patterns: [
      /^\s*(calc|calculate|compute)\s+/i,
      /^\s*[-(]?\d[\d\s+\-*/().%^]*[)\s]*$/,
      /\bwhat(?:'s| is)\s+(?:the\s+)?(?:result\s+of\s+)?[\d\s+\-*/().%^]+\?/i,
    ],
    priority: 9,
    autoExecute: true,
    extractParams: (msg) => ({ expression: msg.replace(/^\s*(calc|calculate|compute|what(?:'s| is) the result of)\s*/i, '').replace(/\?$/, '').trim() }),
  },
  {
    tool: 'web_search',
    patterns: [
      /\b(search|look\s*up|find|google)\s+(the\s+)?(web|internet|online)\b/i,
      /\bsearch\s+(?:for|about)\s+/i,
      /\bweb\s+search\b/i,
      /\blatest\s+(news|updates|releases)\b/i,
    ],
    priority: 7,
    autoExecute: true,
    extractParams: (msg) => ({
      query: msg
        .replace(/^(search|look\s*up|find|google)\s+(the\s+)?(web|internet|online)?\s*(for|about|on)?\s*/i, '')
        .replace(/\b(web|internet|online)\s*search\b/i, '')
        .trim() || msg,
    }),
  },
  {
    tool: 'deep_research',
    patterns: [
      /\b(deep\s+research|research\s+deeply|in[- ]?depth\s+(research|analysis|dive))\b/i,
      /\b(research|investigate|analyze)\s+(competitors|market|industry|topic)\b/i,
      // Batch 2 — allow words between the verb and the topic noun so natural
      // requests like "Research the current USDT market" route to research
      // (with web search + shadowdata capture) instead of plain chat.
      /\b(?:research|investigate)\b[^.?!]{0,40}?\b(?:market|industry|topic|competitors?|landscape|trends?)\b/i,
    ],
    priority: 8,
    autoExecute: true,
    extractParams: (msg) => ({
      query: msg
        .replace(/^(deep\s+research|research|investigate|analyze)\s+(deeply\s+|about\s+|on\s+)?/i, '')
        .trim() || msg,
    }),
  },
  {
    tool: 'image_generator',
    patterns: [
      /\b(generate|create|make|draw|design|imagine)\s+(me\s+)?(a\s+|an\s+)?(image|picture|photo|illustration|artwork|logo|icon|banner|poster)\b/i,
      /\bshow\s+me\s+(a\s+|an\s+)?(image|picture|visual)\s+of\b/i,
    ],
    priority: 9,
    autoExecute: true,
    extractParams: (msg) => ({ prompt: msg }),
  },
  {
    tool: 'music_generator',
    patterns: [
      /\b(generate|create|make|compose)\s+(me\s+)?(a\s+|an\s+)?(song|music|track|beat|melody)\b/i,
    ],
    priority: 9,
    autoExecute: true,
    extractParams: (msg) => ({ prompt: msg }),
  },
  {
    tool: 'document_generator',
    // Only trigger on EXPLICIT slash commands — not casual mentions of
    // "document" or "report" in natural language. This stops the unwanted
    // auto-generation of documents when users are just chatting.
    // Slash commands: /doc, /draft, /write, /document
    patterns: [
      /^\/(doc|draft|write|document)\b/i,
      /\b(open|launch|show)\s+(the\s+)?(document\s+(studio|generator|creator)|doc\s+(studio|generator))\b/i,
    ],
    priority: 9,
    autoExecute: false,  // was: true — caused unwanted document generation
    extractParams: (msg) => {
      const cleaned = msg
        .replace(/^\/(doc|draft|write|document)\s*/i, '')
        .replace(/^(open|launch|show)\s+(me\s+)?(the\s+)?(document\s+(studio|generator|creator)|doc\s+(studio|generator))?\s*/i, '')
        .trim();
      return { topic: cleaned || msg, prompt: cleaned || msg };
    },
  },
  {
    tool: 'presentation_builder',
    patterns: [
      /\b(create|make|build|generate|design)\s+(?:a\s+|an\s+)?(?:presentation|ppt|pptx|slides?|slide\s*deck|deck|powerpoint|pitch\s*deck)/i,
      /\bpresentation\s+(?:builder|creator|maker|generator)/i,
      /\b(build|create)\s+(?:me\s+)?(?:a\s+)?(?:slide\s*)?deck/i,
      /\bpitch\s*deck/i,
      /\bpowerpoint/i,
      /\bslide\s*show/i,
      /\bkimi\s+slides?\b/i,
      /\bslide\s+studio\b/i,
    ],
    priority: 10,
    autoExecute: true,
    extractParams: (msg: string) => {
      const cleaned = msg
        .replace(/^(create|make|build|generate|design)\s+(me\s+)?(a\s+|an\s+)?(presentation|ppt|pptx|slides?|slide\s*deck|deck|powerpoint|pitch\s*deck)\s*(about|on|for)?\s*/i, '')
        .trim();
      return { topic: cleaned || msg, mode: /\bvisual\b/i.test(msg) ? "visual" : "adaptive" };
    }
  },
  {
    tool: 'strategy_agent',
    patterns: [
      /\b(strategy|swot|business\s+plan|market\s+analysis)\b/i,
      /\b(analyze|run)\s+strategy/i,
    ],
    priority: 9,
    autoExecute: true,
  },
  {
    tool: 'stealth_vault',
    patterns: [
      /\b(encrypt|secure|protect|hide)\s+(?:my\s+)?(?:data|notes|secrets|passwords)/i,
      /\bopen\s+(?:the\s+)?(?:stealth\s+)?vault/i,
      /\bsave\s+(?:to\s+)?(?:stealth\s+)?vault/i,
      /\bprivacy\s+vault/i,
    ],
    priority: 3,
    autoExecute: false,
  },
  {
    tool: 'knowledge_vault',
    patterns: [
      /\bknowledge\s+(?:vault|base|graph)/i,
      /\b(open|show|manage)\s+(?:my\s+)?knowledge/i,
      /\bsave\s+(?:this\s+)?(?:to\s+)?knowledge/i,
      /\brag\s+(?:search|query)/i,
    ],
    priority: 5,
    autoExecute: false,
  },
  {
    tool: 'memory_panel',
    patterns: [
      /\b(open|show|manage)\s+(?:my\s+)?(?:ai\s+)?memory/i,
      /\bmemory\s+(?:panel|vault|manager)/i,
      /\bwhat\s+do\s+you\s+(?:remember|know)\s+about\s+me/i,
      /\bbusiness\s+(?:memory|context|profile)/i,
      /\bremember\s+(?:this|that|my)/i,
    ],
    priority: 5,
    autoExecute: false,
  },
];

/** Evaluate a plain arithmetic expression safely (no identifiers, no calls). */
export function executeCalculator(expression: string): string {
  const expr = expression.trim();
  if (!expr) return "I couldn't find a math expression in that.";
  const sanitized = expr.replace(/[×]/g, "*").replace(/[÷]/g, "/").replace(/\^/g, "**");
  if (!/^[0-9+\-*/().%\s]+$/.test(sanitized)) {
    return `I can only evaluate plain arithmetic — "${expr}" contains letters or symbols I won't execute.`;
  }
  try {
    const result = Function(`"use strict"; return (${sanitized});`)();
    if (typeof result !== "number" || !isFinite(result)) {
      return "That expression didn't produce a finite number.";
    }
    return `**${expr} = ${Number.isInteger(result) ? result : Number(result.toFixed(6))}**`;
  } catch {
    return "I couldn't calculate that expression. Check the syntax and try again.";
  }
}

/**
 * Pure tool detection (Batch 2 — extracted from the hook for testability).
 * Same behavior: highest-confidence pattern match wins.
 */
export function detectToolSync(message: string): ToolDetectionResult {
  const normalizedMessage = message.trim().toLowerCase();
  if (!normalizedMessage || normalizedMessage.length < 3) {
    return { tool: null, confidence: 0 };
  }
  let bestMatch: ToolDetectionResult = { tool: null, confidence: 0 };
  for (const toolDef of TOOL_PATTERNS) {
    for (const pattern of toolDef.patterns) {
      if (pattern.test(message)) {
        const confidence = toolDef.priority * 10;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            tool: toolDef.tool,
            confidence,
            params: toolDef.extractParams?.(message),
            autoExecute: toolDef.autoExecute ?? false,
            originalMessage: message,
          };
        }
        break;
      }
    }
  }
  return bestMatch;
}

export const useToolOrchestrator = () => {
  const detectTool = useCallback((message: string): ToolDetectionResult => {
    return detectToolSync(message);
  }, []);

  return {
    detectTool,
    executeCalculator,
  };
};
