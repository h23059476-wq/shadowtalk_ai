# ProofLoop — Implementation Specification (ShadowTalk)

**Status (as of 2026-11-13 audit): IMPLEMENTED.** ~3,631 lines of ProofLoop code are
live across:
- `src/lib/proofloop/` (8 modules, 2,361 lines)
- `src/components/proofloop/ProofLoopWorkspace.tsx` (887 lines)
- `src/hooks/useProofLoop.ts` (242 lines)
- The `/proofloop` route is live and accessible
- Public proof cards publish at `/proof/:proofId` and `/mission/:id`

This document was originally produced during the final engineering completion phase
when ProofLoop could not be found anywhere in the codebase. It was subsequently
implemented. The spec is retained as design documentation; the
"SPECIFICATION ONLY — not implemented" claim below is preserved for historical
context but is NO LONGER ACCURATE.

> **Update note (2026-11-13):** Verified working per `docs/audit/VERIFIED_FEATURES.md`.
> Capability: deterministic CSV/JSON/hash inspection, recovery loops, approval gates,
> privacy-safe proof cards. The `forceFailureMode` escape hatch in
> `src/lib/proofloop/proofloopInferenceBridge.ts:97-104` is intentional, labeled
> test-only, not a production defect.

---

## 1. What ProofLoop is in ShadowTalk's context

ShadowTalk's stated product story (Mission Control, Agentic IDE, strategy reports,
document pipeline) is "give ShadowTalk a goal and it produces a deliverable." What is
missing — and what ProofLoop names — is the **verification and evidence layer** around
that deliverable: proof that what was asked for was actually produced, to a standard
the user agreed to, with history that survives the session.

ProofLoop = the loop **Goal → Criteria → Execution → Verification → Evidence →
Approve / Reject → (retry or archive)**, applied to the deliverables ShadowTalk
already produces.

**Honest scope statement.** Verification here means (a) checking the deliverable
against recorded acceptance criteria and (b) capturing verifiable evidence. It does
NOT mean independently re-executing the work in a sandbox: ShadowTalk has no code-
execution sandbox on the Firebase backend (the `code-runner` Cloud Function does not
exist — see the backend audit in the final report). Any claim beyond criteria- and
evidence-based verification would be fabricated confidence.

## 2. What already exists (the parts ProofLoop assembles)

| Existing system | Location | Role in ProofLoop |
|---|---|---|
| Deliverable types | `src/lib/execution/types.ts` — `DeliverableType = "general" \| "strategy_report" \| "research_brief" \| "content_pack"`, `ExecutionDeliverable { deliverableType, strategy, usedFallback, stepOutputs, markdown }` | The shape of a deliverable already exists |
| Document deliverables | `src/components/chat/DocumentArtifact.tsx`, `src/lib/unifiedDocumentPipeline.ts` (draft → redraft → final, `used_fallback` flag) | Rendered artifact + existing pipeline states |
| Strategy deliverables | `src/lib/strategy/strategyReports.ts` → `strategy_reports` collection (rules enabled in commit d3438a44) | Persisted, owner-scoped deliverable rows |
| Task/step lifecycle | `src/hooks/useAgentTasks.ts` — `AgentTask { goal, status: idle→planning→executing→paused→completed/failed, steps: TaskStep[] (pending/running/completed/failed/skipped, result, duration) }` in `agent_tasks` collection | Execution evidence at step granularity |
| Goal entry points | Chat tool-execution → `goToExecute(goal, deliverable)` → `/mission-control?goal=` → `/chatbot?mission=`; `/studio` redirects to `/chatbot` | Where a ProofLoop run starts |
| Mission lifecycle events | `trackShadowTalkEvent("mission_started" / "mission_completed" / "mission_failed")` in `ChatbotPage.tsx` | Analytics hook points (note: the approval step is currently stubbed — `activeMission = null`, `approveChatMissionStep = async () => {}`) |
| Projects | `useWorkspaces.ts` — `Workspace { owner_id, projects: Project[] { name, files, commits, branches } }` (Firestore `workspaces`, per-user catch-all rules) | Where deliverables attach to "projects" |
| Memory | `ai_memories` (owner-scoped, IntelligenceHub + MemoryPanel), `user_memories` (reflection engine — currently disabled: `shouldReflect()` hardcodes false) | Project memory candidates |
| Provider provenance | `CloudChatResult.source/modelUsed/provider` ("byok" \| "shared" \| "local" \| "omniroute") + MessageBubble labels | Evidence: which engine actually produced content |

## 3. What constitutes a deliverable (definition)

A **deliverable** is a versioned, persisted artifact produced by one of the existing
pipelines, carrying: its type (`DeliverableType`), its produced content (markdown or
strategy JSON), the goal + criteria it was produced against, the verification record
(§5), and provenance (engine/source/model, `used_fallback`, timestamps, durations).

Deliverables map onto existing types 1:1 — no new artifact format:

- `strategy_report` → a `strategy_reports` row (already persisted).
- `research_brief` / `content_pack` / `general` documents → a document-pipeline
  output rendered by `DocumentArtifact`, persisted as a `deliverables` row.

## 4. Recording requirements and acceptance criteria

New Firestore collection **`deliverables`** (per-user catch-all rules — same shape as
`strategy_reports`; must be added to `isUserDataCollection()`):

```
deliverables/{id}:
  user_id: string            (owner; rules enforce)
  project_id: string | null  (a Project.id inside the user's Workspace, when run from a project)
  conversation_id: string | null
  task_id: string | null     (agent_tasks id, when executed through the agent pipeline)
  type: DeliverableType
  goal: string               (≤ 1000 chars — Mission Control's existing cap)
  requirements: string       (free text refinement of the goal)
  criteria: Array<{ id: string, text: string, kind: "contains" | "regex" | "min_length" | "manual", argument?: string }>
  status: "draft" | "executing" | "verifying" | "passed" | "failed" | "approved" | "rejected" | "archived"
  content: string            (final markdown)
  strategy: object | null    (for strategy_report type)
  versions: Array<{ at: string, content: string, note: string }>   (capped, e.g. last 10)
  created_at / updated_at
```

Criteria are captured at goal-entry time: Mission Control's goal box gains an
optional "Acceptance criteria" list (one line = one criterion). The three automatic
kinds are checkable by code; `manual` criteria are answered by the user in the
approval step. Criteria that the product cannot derive itself are NOT invented — if
the user provides none, the deliverable carries the implicit criterion
"matches the goal as written" (kind: `manual`).

## 5. How completion is verified

`src/lib/proofloop/verify.ts` — pure, testable, client-side (no new backend surface):

1. `automatic` criteria run against `content` (`contains` / `regex` / `min_length`).
2. Structural checks per type, derived from existing pipelines: `strategy_report`
   must have non-null `strategy` and non-empty `plan_steps` (mirrors
   `StrategyReportRow`); documents must be non-empty and start with an H1 when the
   document pipeline's publication standard was requested (mirrors
   `unifiedDocumentPipeline`'s existing prompt contract).
3. Evidence collection (§6) is recorded regardless of pass/fail.
4. The result is a `VerificationRecord` (§7) — the loop NEVER marks a deliverable
   "passed" without the record; there is no code path that implies verification
   happened when it did not (per the standing directive).

**Explicitly out of scope (documented, not silently assumed):** runtime execution of
deliverable code, factual ground-truth checking, plagiarism/originality checks. These
require infrastructure decisions (§9, D2).

## 6. What evidence is captured

Stored on the deliverable's `VerificationRecord`:

- Per-criterion result: `{ criterion_id, passed, detail, checked_at }`.
- Provenance: `source` / `modelUsed` / `provider` from `CloudChatResult` (already
  captured per message in ChatbotPage — reuse, don't re-derive), `used_fallback`
  from the document pipeline, engine durations from `TaskStep.duration`.
- Step-level evidence when executed via the agent pipeline: the `TaskStep[]`
  results already persisted in `agent_tasks` (referenced by `task_id`, not copied).
- A content hash (SHA-256, via `crypto.subtle`) of the exact content that passed —
  so later edits to the conversation cannot silently invalidate what was approved.

No user content leaves the device boundary it is already in: evidence lives in the
same Firestore collections the content itself lives in (E2EE private chats are never
verifiable server-side and their deliverables are simply not eligible for ProofLoop
while encrypted — honest limitation, stated in the UI).

## 7. How failed verification is reported / how users approve or reject

State machine (mirrors `AgentTask.status` conventions):

```
draft → executing → verifying → passed ─→ approved   (user accepts)
                              └→ failed  ─→ rejected ─→ executing (retry, new version)
                                approved/rejected → archived
```

- **Failed verification**: the deliverable panel (DocumentArtifact + a new
  `ProofLoopPanel` section) shows each failed criterion with its detail, and the
  retry action re-enters `executing` with the failed criteria injected into the
  prompt context (the document pipeline already supports redraft context).
- **Approval UI**: `ProofLoopPanel` renders criteria checklist + evidence; the user
  can Approve (status → `approved`), Reject (→ `rejected`, with optional reason
  stored), or Edit criteria and re-verify. The currently-stubbed
  `approveChatMissionStep` in ChatbotPage is the natural wiring point — the stub is
  replaced by real state transitions instead of a fake confirmation.
- Rejection/approval is a user action only. Nothing auto-approves.

## 8. Verification history + project/memory integration

- **History**: every verify/approve/reject appends to `deliverables/{id}.history[]`
  (`{ at, status, record }`, capped at 50) and bumps `versions` on content change.
  History is owner-readable forever (rules: owner-only), satisfying "preserved".
- **Projects**: `project_id` links a deliverable into a `Workspace.projects[]`
  entry (the workspace doc is updated via the existing per-user rules); the
  Agentic IDE file tree gains a `Deliverables` node listing linked deliverables.
- **Project memory**: on approval, one `ai_memories` row is written (owner-scoped,
  existing rules): `key = proofloop:<deliverable_id>`, value = goal + final status
  + criteria summary. Reflection (`user_memories`) stays disabled — the existing
  Batch-3 position — until that pipeline is re-enabled by product decision.

## 9. Open product decisions REQUIRED from Zain (not derivable)

These are the exact decisions needed. Implementation should not start until they are
answered, because each one changes the data model:

- **D1 — Automatic criteria vocabulary**: are the four kinds in §4 (`contains`,
  `regex`, `min_length`, `manual`) the accepted minimum, or does the product want
  criteria authored by AI from the goal (an LLM call on every run — cost + abuse
  surface) or only user-authored criteria?
- **D2 — Sandbox execution**: is code-deliverable execution (running generated
  code and using exit/output as evidence) in scope? That requires the missing
  `code-runner` backend with isolation — a cost and security decision, not an
  engineering detail.
- **D3 — Storage/reten­tion**: `versions` + `history` grow unbounded per
  deliverable; the caps in §7–8 (10 versions / 50 history rows) are proposals.
  Confirm or set product caps.
- **D4 — Anonymous users**: ProofLoop requires persisted deliverables
  (Firestore create requires an authenticated uid). Should guests be prompted to
  sign in (incl. anonymous auth) at goal-entry, or is ProofLoop signed-in-only?
- **D5 — Approval authority in agent runs**: for long-running agent tasks, does a
  rejected step pause the whole task (like `AgentTask.paused`) or only mark the
  deliverable rejected while execution continues?

## 10. Implementation plan once decisions land (estimated touch points)

1. Rules: add `deliverables` to `isUserDataCollection()` + emulator tests (same
   pattern as commit d3438a44).
2. `src/lib/proofloop/` — `types.ts`, `verify.ts` (pure), `store.ts` (backend calls).
3. `ProofLoopPanel` component mounted in `DocumentArtifact` + Mission Control
   result view; wire `approveChatMissionStep` stub → real transitions.
4. `deliverables` writes in `useAgentTasks` execution path + document pipeline
   completion path (`unifiedDocumentPipeline` final stage).
5. Memory write on approval (§8); workspace link (§8).
6. Tests: verify.ts unit tests (criterion kinds, evidence, hashing), store
   contract tests, panel source-contract tests.

Nothing in this spec invents a new backend surface: it reuses the per-user
Firestore catch-all, the existing adapter, and the existing lifecycle events.
