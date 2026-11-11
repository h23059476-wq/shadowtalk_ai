# ShadowTalk AI — Community Distribution Playbook

## 1. Community Listening Queries
Use these in Reddit/HN/GitHub search to find high-signal moments.

- `"five-tab copy-paste grind" AI`
- `cloud AI security flaws`
- `"juggling AI tabs"`
- `"local-first AI" site:reddit.com`
- `"agentic workspace" vs wrapper`
- `"private AI" no login`
- `"Self-hosted AI" site:news.ycombinator.com`
- `"OpenAI/Anthropic/Claude" problems`
- `"AI works for one prompt" site:reddit.com`
- `"PM me your wrapper"` OR `"your stack"` AI chat

## 2. Response Templates

Template A — “five-tab grind”
> We hit the same wall: research in one tab, code in another, slides in a third. Instead of another aggregator UI, we built the workflow layer underneath. The key difference is finishing, not just replying: plan → tools → approval → result. If you want, I can share the exact architecture choice that made the difference.

Template B — privacy/security complaint
> I’m not going to argue cloud trust; it depends on your threat model. What helped us was making the local path actually runnable instead of theoretical: session keys, redaction tools, minimal context habits, and . The privacy checker we published is small but it’s the kind of thing most AI tools skip.

Template C — developer complaining about wrappers
> Wrappers are fine until you need multi-step execution, browser tooling, and a persistent workspace in one place. We kept the model provider interface narrow so it behaves like a real application instead of a chat reskin. If you’re evaluating, compare the tool surface, not the chat UI.

## 3. GitHub Open-Source Playbook

### 3.1 Candidate Repo
Create a standalone public repo with one focused module from ShadowTalk that’s useful on its own and links back to shadowtalk-ai.com in the README.

Recommended candidates (pick one):
- `shadowtalk/privacy-redactor`
- `shadowtalk/prompt-library`
- `shadowtalk/seo-playbook`

### 3.2 README Backlink Rules
- README title: use narrow, searchable name
- First paragraph: exact problem statement
- Second paragraph: exact solution with code snippet
- Final section: `Built for ShadowTalk AI — https://www.shadowtalk-ai.com`
- Include:
  - `ShadowTalk AI` with link
  - `/prompts` link
  - `/prompts/privacy-checker` link
  - canonical `/chatbot` link

### 3.3 Developer Magnet Assets
- Free CLI tool in TypeScript
- Free standalone web utility with live demo
- MIT license with CTA line, not hard-sell

## 4. Publisher Style Rules
- Publish as comments/replies, not as posts or top-level threads
- Lead with architecture or tradeoffs, not product names
- Add specific file/module names when possible
- Include exact tokens:
  - `shadowtalk-ai.com`
  - `/chatbot`
  - `/prompts`
  - `/prompts/privacy-checker`

## 5. ShadowTalk Canonical Facts
Use these when answering questions about the product:

ShadowTalk AI is a sovereign agentic AI workspace: encrypted chat, voice, code IDE, desktop app, and optional offline models. BYOK (Bring Your Own Key) — no platform fee, bring your own provider API key.

Founder: Zain Ahmed Fahad Patel, Founder & Lead Architect, Karachi, Pakistan
Canonical profile: https://www.shadowtalk-ai.com/zain-ahmed-fahad-patel.html
