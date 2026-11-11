export type TaskComplexity = 'low' | 'medium' | 'high';

import { TURBO_MODEL_GROQ, TURBO_MODEL_CHAT, TURBO_MODEL_OPENROUTER, TURBO_MODEL_OPENAI, resolveOpenAIKey } from './turboProviders';
import { WEBGPU_MODEL, isWebGPUSupported } from '@/lib/webgpu/localEngine';

import { isSovereignAgentsEnabled } from '@/lib/desktop/sovereignAgentMode';
export interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Analyzes the complexity of a prompt or a series of messages
 * to determine the optimal AI model to route the request to.
 */
export function analyzeComplexity(messages: ChatMessage[]): TaskComplexity {
  if (!messages || messages.length === 0) return 'low';
  
  const userMessages = messages.filter(m => m.role === 'user' || m.role === 'system');
  if (userMessages.length === 0) return 'low';
  
  const lastUserPrompt = userMessages[userMessages.length - 1].content.toLowerCase();
  const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);

  // High complexity triggers: complex logic, coding, deep research, image analysis
  const highComplexityKeywords = [
    'research', 'analyze', 'debug', 'code', 'script', 'refactor',
    'architect', 'design', 'compare', 'evaluate', 'synthesize',
    'python', 'javascript', 'typescript', 'sql', 'database', 'security'
  ];

  // Low complexity triggers: basic greetings, simple formatting, trivial summarization
  const lowComplexityKeywords = [
    'hi', 'hello', 'hey', 'thanks', 'summarize', 'tldr', 'format',
    'fix typo', 'yes', 'no', 'ok', 'okay', 'sure'
  ];

  // Length heuristics
  if (totalLength > 4000) return 'high'; // Very long context implies high complexity
  if (totalLength < 100) return 'low'; // Very short context usually low complexity

  // Keyword heuristics
  let highScore = 0;
  for (const keyword of highComplexityKeywords) {
    if (lastUserPrompt.includes(keyword)) highScore++;
  }
  
  let lowScore = 0;
  for (const keyword of lowComplexityKeywords) {
    if (lastUserPrompt.includes(keyword)) lowScore++;
  }

  if (highScore > 0 && highScore > lowScore) return 'high';
  if (lowScore > 0 && lowScore > highScore) return 'low';

  // Default to medium
  return 'medium';
}

/**
 * Intelligent Model Router
 * 
 * Routes a task to the most appropriate model based on its complexity.
 * This ensures we don't spend expensive tokens on simple summarization tasks.
 */
export function routeTask(
  complexity: TaskComplexity = 'medium',
  hasApiKey: boolean = false
): { target: 'local' | 'groq' | 'openrouter' | 'openai' | 'cloud', model: string } {
  

  // 2. High Complexity (Strategy, Research)
  if (complexity === 'high') {
    if (resolveOpenAIKey()) {
      return { target: 'openai', model: TURBO_MODEL_OPENAI };
    }
    if (hasApiKey) {
      return { target: 'openrouter', model: TURBO_MODEL_OPENROUTER }; // e.g. Claude 3.5 or GPT-4o
    }
    return { target: 'cloud', model: 'default' }; // Cloud edge fallback
  }

  // 3. Low Complexity (UI generation, title summarization, simple chat)
  if (complexity === 'low') {
    if (hasApiKey) {
      return { target: 'groq', model: TURBO_MODEL_CHAT }; // Llama-3-8B (fast & cheap)
    }
    return { target: 'cloud', model: 'default' };
  }

  // 4. Medium Complexity (Standard chat logic)
  if (hasApiKey) {
    return { target: 'groq', model: TURBO_MODEL_GROQ }; // Llama-3-70B
  }
  
  return { target: 'cloud', model: 'default' };
}
