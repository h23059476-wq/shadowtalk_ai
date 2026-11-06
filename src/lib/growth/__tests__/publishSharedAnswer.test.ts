/**
 * Final completion phase — share-answer flow repaired.
 *
 * The publish path previously invoked a `share-answer` Cloud Function that
 * does not exist, and the /s/:slug read path used a Postgres RPC the Firebase
 * adapter always refuses — publishing AND viewing shared answers were both
 * dead. Publishing now writes directly to the `shared_answers` collection
 * (owner-scoped create per the security rules) and the page reads by slug.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const backendMock = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}));

vi.mock("@/integrations/local/client", () => ({ backend: backendMock }));

import { publishSharedAnswer } from "@/lib/growth/publishSharedAnswer";

interface Builder {
  select: () => Builder;
  eq: () => Builder;
  limit: () => Builder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
  insert: (payload: Record<string, unknown>) => Builder;
}

function makeBuilder(overrides: Partial<Builder> = {}): Builder {
  const builder = {} as Builder;
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.limit = () => builder;
  builder.maybeSingle = async () => ({ data: null, error: null });
  builder.single = async () => ({ data: { id: "row-1" }, error: null });
  builder.insert = () => builder;
  Object.assign(builder, overrides);
  return builder;
}

describe("publishSharedAnswer (direct Firestore)", () => {
  beforeEach(() => {
    backendMock.auth.getUser.mockReset();
    backendMock.from.mockReset();
  });

  it("inserts a slug-keyed, owner-stamped answer and returns the /s/ URL", async () => {
    backendMock.auth.getUser.mockResolvedValue({ data: { user: { id: "uid-alice" } } });
    const inserted: Record<string, unknown>[] = [];
    backendMock.from.mockImplementation((_table: string) => {
      const builder = makeBuilder({
        insert: (payload: Record<string, unknown>) => { inserted.push(payload); return builder; },
        single: async () => ({ data: { id: "row-1" }, error: null }),
      });
      return builder;
    });

    const result = await publishSharedAnswer({
      prompt: "What is E2EE?",
      answer: "# E2EE\nExplanation…",
      title: "End to End Encryption!",
      source: "chat",
    });

    expect(result.slug).toMatch(/^end-to-end-encryption-[a-z0-9]{8}$/);
    expect(result.url).toContain(`/s/${result.slug}`);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      slug: result.slug,
      user_id: "uid-alice",
      prompt: "What is E2EE?",
      source: "chat",
      views: 0,
    });
  });

  it("retries slug generation when a collision exists", async () => {
    backendMock.auth.getUser.mockResolvedValue({ data: { user: { id: "uid-alice" } } });
    const inserted: Record<string, unknown>[] = [];
    let collisionChecks = 0;
    backendMock.from.mockImplementation((_table: string) => {
      const builder = makeBuilder({
        maybeSingle: async () => {
          collisionChecks += 1;
          return { data: collisionChecks <= 2 ? { id: "taken" } : null, error: null };
        },
        insert: (payload: Record<string, unknown>) => { inserted.push(payload); return builder; },
      });
      return builder;
    });

    const result = await publishSharedAnswer({ prompt: "p", answer: "a" });
    expect(collisionChecks).toBeGreaterThanOrEqual(3);
    expect(inserted[0].slug).toBe(result.slug);
  });

  it("requires a signed-in user (rules require user_id == auth.uid on create)", async () => {
    backendMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    await expect(publishSharedAnswer({ prompt: "p", answer: "a" })).rejects.toThrow(/Sign in/);
  });

  it("surfaces insert failures instead of pretending the answer was published", async () => {
    backendMock.auth.getUser.mockResolvedValue({ data: { user: { id: "uid-alice" } } });
    backendMock.from.mockImplementation(() =>
      makeBuilder({ single: async () => ({ data: null, error: new Error("permission denied") }) }),
    );
    await expect(publishSharedAnswer({ prompt: "p", answer: "a" })).rejects.toThrow(/permission denied/);
  });
});

describe("SharedAnswerPage read path (source contract)", () => {
  it("queries shared_answers by slug and no longer uses the always-failing rpc", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/pages/SharedAnswerPage.tsx"), "utf8");
    expect(src).toContain('.from("shared_answers")');
    expect(src).toMatch(/\.eq\("slug", slug\)/);
    expect(src).not.toContain("rpc(");
    // View increments must not be faked client-side (rules forbid anonymous
    // document updates).
    expect(src).not.toContain("increment_shared_answer_views");
  });
});
