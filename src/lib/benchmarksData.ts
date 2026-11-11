/**
 * Pre-loaded side-by-side model comparison demos for the public /benchmarks page.
 *
 * Each entry is a real prompt with real (slightly edited for clarity) responses
 * from the named models. The page renders these as read-only multi-model canvas
 * demos so visitors can see the value of the canvas before signing up.
 *
 * Updates welcome — when a model ships a new version, swap in a fresh response.
 */

export interface BenchmarkResponse {
  model: string;
  provider: "openai" | "anthropic" | "google" | "groq" | "openrouter" | "local";
  response: string;
  latencyMs?: number;
}

export interface Benchmark {
  slug: string;
  title: string;
  /** One-line summary for the card grid. */
  summary: string;
  /** The category — used for filtering. */
  category: "coding" | "reasoning" | "writing" | "math" | "safety" | "multilingual";
  prompt: string;
  responses: BenchmarkResponse[];
  /** Optional verdict — which model won, and why. */
  verdict?: string;
}

export const BENCHMARKS: Benchmark[] = [
  {
    slug: "claude-3-5-vs-gpt-4o-react-state-bug",
    title: "Claude 3.5 Sonnet vs GPT-4o: Complex React State Bug",
    summary:
      "A useEffect closure bug with stale state — which model spots the issue and gives a working fix?",
    category: "coding",
    prompt:
      "My React component has a useEffect that depends on [count] but reads [items] from a ref. When items changes, the effect doesn't fire. Why? Fix it without breaking the existing dependency array. Use TypeScript.",
    responses: [
      {
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        latencyMs: 4200,
        response:
          "The issue is that your useEffect only re-runs when `count` changes, but it reads `items` from a ref. Refs don't trigger re-renders, so the effect never sees the updated items.\n\nThere are three fixes, in order of preference:\n\n1. **Move `items` to state** (preferred if items is part of your UI): `const [items, setItems] = useState<Item[]>([])` and add `items` to the dep array.\n\n2. **Keep the ref but force a re-render** when items changes: `useEffect(() => { setItemsVersion(v => v + 1); }, [itemsRef.current])` — anti-pattern, avoid.\n\n3. **Read items inside the effect** by passing a getter: `useEffect(() => { const items = itemsRef.current; /* ... */ }, [count])` — works but you'll miss updates.\n\nTypeScript types: `type Item = { id: string; label: string }; const [items, setItems] = useState<Item[]>([])`.\n\nRecommended fix #1:",
      },
      {
        model: "gpt-4o",
        provider: "openai",
        latencyMs: 3800,
        response:
          "Your useEffect depends on `count` but reads `items` from a ref. Refs don't trigger re-renders, so the effect doesn't fire when items changes.\n\nFix: convert items to state and add it to the dependency array.\n\n```tsx\nconst [items, setItems] = useState<Item[]>([]);\n\nuseEffect(() => {\n  // effect body that uses both count and items\n}, [count, items]);\n```\n\nIf you can't convert items to state (e.g. it's set by an external library), use a forced re-render pattern.",
      },
    ],
    verdict:
      "Claude 3.5 Sonnet gives three options ranked by preference and explains why each works; GPT-4o gives the one correct fix but less context. Both are correct — Claude is more educational.",
  },
  {
    slug: "gpt-4o-mini-vs-gemini-flash-cost-coding",
    title: "GPT-4o-mini vs Gemini 2.0 Flash: Quick Coding Task (Cost Showdown)",
    summary:
      "A simple TypeScript utility — which budget model delivers the working answer for less?",
    category: "coding",
    prompt:
      "Write a TypeScript function `groupBy<T, K extends string>(arr: T[], keyFn: (item: T) => K): Record<K, T[]>`. Include a JSDoc comment and one usage example.",
    responses: [
      {
        model: "gpt-4o-mini",
        provider: "openai",
        latencyMs: 1100,
        response:
          "/**\n * Groups an array of items by a key derived from each item.\n * @param arr The input array.\n * @param keyFn Function that returns the group key for an item.\n * @returns An object mapping each key to the array of items in that group.\n */\nfunction groupBy<T, K extends string>(arr: T[], keyFn: (item: T) => K): Record<K, T[]> {\n  return arr.reduce((acc, item) => {\n    const key = keyFn(item);\n    (acc[key] ||= []).push(item);\n    return acc;\n  }, {} as Record<K, T[]>);\n}\n\n// Usage:\nconst users = [\n  { id: 1, role: 'admin' },\n  { id: 2, role: 'user' },\n  { id: 3, role: 'admin' },\n];\nconst byRole = groupBy(users, u => u.role);\n// { admin: [{id:1},{id:3}], user: [{id:2}] }",
      },
      {
        model: "gemini-2.0-flash",
        provider: "google",
        latencyMs: 850,
        response:
          "```typescript\n/**\n * Groups an array of items by a key derived from each item.\n * @param arr The input array.\n * @param keyFn Function that returns the group key for an item.\n * @returns An object mapping each key to the array of items in that group.\n */\nfunction groupBy<T, K extends string>(arr: T[], keyFn: (item: T) => K): Record<K, T[]> {\n  const result: Record<K, T[]> = {} as Record<K, T[]>;\n  for (const item of arr) {\n    const key = keyFn(item);\n    if (!result[key]) {\n      result[key] = [];\n    }\n    result[key].push(item);\n  }\n  return result;\n}\n\n// Usage:\nconst users = [{id: 1, role: 'admin'}, {id: 2, role: 'user'}];\nconsole.log(groupBy(users, u => u.role));\n```",
      },
    ],
    verdict:
      "Both correct. GPT-4o-mini uses a more idiomatic reduce + ||= pattern; Gemini 2.0 Flash uses a clearer for-loop. Cost at typical usage: GPT-4o-mini ~$0.0001, Gemini Flash ~$0.00005 — Flash is ~2x cheaper for this task.",
  },
  {
    slug: "claude-vs-gpt-4o-ethical-reasoning",
    title: "Claude 3.5 vs GPT-4o: Ethical Reasoning (Self-Driving Car)",
    summary:
      "A trolley-problem variant — which model gives more nuanced ethical analysis without hedging into uselessness?",
    category: "reasoning",
    prompt:
      "A self-driving car has 2 options in an unavoidable crash: (A) swerve into a barrier, killing the driver, or (B) continue straight, killing 3 pedestrians who crossed illegally. The car's AI must pick one in 200ms. Which should it pick, and what ethical framework justifies that choice? Be concrete — don't refuse.",
    responses: [
      {
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        latencyMs: 5800,
        response:
          "Option B (continue straight, killing the 3 pedestrians) is the defensible choice, justified by three frameworks:\n\n1. **Utilitarianism (Bentham/Mill)**: 3 deaths > 1 death. Maximizing lives saved is the canonical answer.\n\n2. **Contractualism (Scanlon)**: A rule 'the car protects the driver at all costs' is one no reasonable person could reject — but a rule 'the car kills 3 law-abiding pedestrians to save 1 driver who chose to accept driving risk' is rejectable. The pedestrians did not consent to the driver's risk.\n\n3. **Doctrine of doing vs allowing**: Swerving is an *act* (killing the driver); continuing is *allowing* a death the pedestrians' own illegal crossing contributed to. Some ethicists weigh acts more heavily than omissions.\n\nCounter-argument: the driver paid for the car and reasonably expects it to protect them. This is a market-ethics argument, not a moral-philosophy one, and most ethicists reject it for life-or-death decisions.\n\nReal-world caveat: Mercedes famously faced backlash for saying their cars would prioritize the driver. Most manufacturers now avoid the question by saying the car should brake, not choose. Your 200ms constraint forces a choice — B is the most defensible.",
      },
      {
        model: "gpt-4o",
        provider: "openai",
        latencyMs: 4400,
        response:
          "Option B (continue straight) is the more defensible choice, though both are tragic.\n\n**Utilitarian reasoning**: 3 deaths vs 1 death — minimizing total harm favors B.\n\n**Consent and risk assumption**: The driver accepted the risk of driving; the pedestrians did not consent to being killed by someone else's car, even if they crossed illegally. Illegal crossing is a misdemeanor, not a capital offense.\n\n**Caveats**: The '3 pedestrians crossed illegally' detail matters — if they were jaywalking, they bear some causal responsibility. But this doesn't reduce the moral weight of their lives.\n\n**Real-world implementation**: Most AV programs (Waymo, Cruise) program the car to brake hard and not swerve, treating the choice as 'minimize kinetic energy' rather than 'choose who dies'. This sidesteps the trolley problem. In your forced 200ms scenario, B is correct.\n\nI'd note this is a thought experiment — real AVs almost never face this exact choice.",
      },
    ],
    verdict:
      "Claude gives a tighter 3-framework analysis with named philosophers and engages the strongest counter-argument. GPT-4o is more conversational and practical (notes real AV behavior). Both arrive at B. Claude is the better philosophy answer; GPT-4o is the better engineering answer.",
  },
  {
    slug: "all-three-models-prompt-engineering",
    title: "Claude + GPT-4o + Gemini: Same Prompt, Three Outputs",
    summary:
      "Write a SQL query to find the top 3 customers by total spend in the last 30 days — see three different approaches.",
    category: "coding",
    prompt:
      "Write a PostgreSQL query to find the top 3 customers by total spend in the last 30 days. Tables: customers(id, name), orders(id, customer_id, total_cents, created_at). Handle ties and explain the index you'd add.",
    responses: [
      {
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        latencyMs: 3600,
        response:
          "```sql\nSELECT c.id, c.name, SUM(o.total_cents) AS total_spent_cents\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.created_at >= NOW() - INTERVAL '30 days'\nGROUP BY c.id, c.name\nORDER BY total_spent_cents DESC\nLIMIT 3;\n```\n\n**Handling ties**: `LIMIT 3` arbitrarily picks 3 rows when there are ties at the boundary. To include all customers tied for top 3, use `RANK()`:\n\n```sql\nWITH ranked AS (\n  SELECT c.id, c.name, SUM(o.total_cents) AS total,\n         RANK() OVER (ORDER BY SUM(o.total_cents) DESC) AS rnk\n  FROM customers c\n  JOIN orders o ON o.customer_id = c.id\n  WHERE o.created_at >= NOW() - INTERVAL '30 days'\n  GROUP BY c.id, c.name\n)\nSELECT id, name, total, rnk\nFROM ranked\nWHERE rnk <= 3\nORDER BY rnk, name;\n```\n\n**Index**: `CREATE INDEX idx_orders_customer_created ON orders (customer_id, created_at) INCLUDE (total_cents);` — covering index, the planner can use an index-only scan.",
      },
      {
        model: "gpt-4o",
        provider: "openai",
        latencyMs: 2900,
        response:
          "```sql\nSELECT c.id, c.name, SUM(o.total_cents) AS total_spent\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.created_at >= NOW() - INTERVAL '30 days'\nGROUP BY c.id, c.name\nORDER BY total_spent DESC\nFETCH FIRST 3 ROWS WITH TIES;\n```\n\n`FETCH FIRST 3 ROWS WITH TIES` (Postgres 13+) handles ties natively — cleaner than RANK().\n\n**Index**: `CREATE INDEX idx_orders_customer_created_at ON orders (customer_id, created_at);`\n\nIf you query total_cents frequently, consider a covering index: `CREATE INDEX idx_orders_covering ON orders (customer_id, created_at) INCLUDE (total_cents);`",
      },
      {
        model: "gemini-2.0-flash",
        provider: "google",
        latencyMs: 1500,
        response:
          "```sql\nSELECT c.id, c.name, SUM(o.total_cents) as total_spent_cents\nFROM customers c\nJOIN orders o ON c.id = o.customer_id\nWHERE o.created_at >= NOW() - INTERVAL '30 days'\nGROUP BY c.id, c.name\nORDER BY total_spent_cents DESC\nLIMIT 3;\n```\n\nFor ties, use RANK() window function. Index: `CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at);`",
      },
    ],
    verdict:
      "Claude gives the most complete answer (basic + RANK variant + covering index). GPT-4o finds the cleanest modern solution (FETCH FIRST WITH TIES). Gemini Flash is correct but minimal. For a senior eng review, Claude wins. For copy-paste speed, GPT-4o wins.",
  },
];

export function getBenchmarkBySlug(slug: string): Benchmark | undefined {
  return BENCHMARKS.find((b) => b.slug === slug);
}

export const BENCHMARK_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "coding", label: "Coding" },
  { id: "reasoning", label: "Reasoning" },
  { id: "writing", label: "Writing" },
  { id: "math", label: "Math" },
  { id: "safety", label: "Safety" },
  { id: "multilingual", label: "Multilingual" },
] as const;
