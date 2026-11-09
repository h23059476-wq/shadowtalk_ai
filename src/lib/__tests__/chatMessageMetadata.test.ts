/**
 * Batch 1 (Research-to-Visualization) — chat message metadata persistence
 * contract (D4 approved approach: extend the existing encrypted
 * message-persistence mechanism; no new collection).
 *
 * Pins the security-critical behavior:
 *  1. Metadata is stored through the SAME encrypt-or-null gate as content —
 *     when private-mode encryption fails, the field is SKIPPED, never
 *     written as plaintext.
 *  2. Decode restores ciphertext via the same display-text resolver and
 *     drops malformed/oversized metadata instead of breaking load.
 *  3. Empty metadata never produces a storage column.
 */

import { describe, it, expect } from "vitest";
import {
  buildMessageMetadata,
  encodeMessageMetadata,
  decodeMessageMetadata,
} from "../chatMessageMetadata";
import type { ResearchDataBlock } from "@/lib/visualization/types";

const block: ResearchDataBlock = {
  datasets: [
    {
      title: "USDT Market Snapshot",
      columns: [
        { key: "metric", type: "string" },
        { key: "value", type: "number" },
      ],
      rows: [{ metric: "price", value: 1.0001 }],
    },
  ],
  sources: [{ url: "https://example.com/usdt" }],
  gaps: [],
  capturedAt: "2026-11-09T12:00:00Z",
};

const passthroughWrap = async (plain: string) => plain;
const identityResolve = async (raw: string) => raw;

describe("chat message metadata — build", () => {
  it("returns null when nothing meaningful is present", () => {
    expect(buildMessageMetadata({})).toBeNull();
    expect(buildMessageMetadata({ citations: [], researchData: [] })).toBeNull();
  });

  it("keeps only the populated fields", () => {
    const meta = buildMessageMetadata({ citations: [{ url: "https://a.example" }], tool: "web_search" });
    expect(meta).toEqual({ citations: [{ url: "https://a.example" }], tool: "web_search" });
  });
});

describe("chat message metadata — encrypt-or-null storage gate", () => {
  it("passes the JSON through the wrap function (normal mode)", async () => {
    const encoded = await encodeMessageMetadata(
      buildMessageMetadata({ citations: [{ url: "https://a.example" }] }),
      passthroughWrap,
    );
    expect(encoded).toBe(JSON.stringify({ citations: [{ url: "https://a.example" }] }));
  });

  it("returns null (never plaintext) when the vault locks mid-session", async () => {
    const failingWrap = async () => null; // private mode + failed encryption
    const encoded = await encodeMessageMetadata(
      buildMessageMetadata({ citations: [{ url: "https://a.example" }], tool: "web_search" }),
      failingWrap,
    );
    expect(encoded).toBeNull();
  });

  it("drops oversized metadata instead of persisting it", async () => {
    const huge = "x".repeat(250_000);
    const encoded = await encodeMessageMetadata(
      buildMessageMetadata({ source: huge }),
      passthroughWrap,
    );
    expect(encoded).toBeNull();
  });
});

describe("chat message metadata — decode", () => {
  it("round-trips plaintext metadata", async () => {
    const meta = buildMessageMetadata({ citations: [{ url: "https://a.example" }], researchData: [block] });
    const encoded = await encodeMessageMetadata(meta, passthroughWrap);
    const decoded = await decodeMessageMetadata(encoded, identityResolve);
    expect(decoded?.citations).toEqual([{ url: "https://a.example" }]);
    expect(decoded?.researchData?.[0].datasets[0].title).toBe("USDT Market Snapshot");
  });

  it("decrypts e2e-wrapped metadata via the same display resolver", async () => {
    const decryptingResolve = async (raw: string) => {
      if (raw.startsWith("e2e:")) {
        // Fake vault: payload is base64(JSON) after "e2e:iv:"
        return Buffer.from(raw.split(":")[2], "base64").toString("utf8");
      }
      return raw;
    };
    const cipher = "e2e:iv:" + Buffer.from(JSON.stringify({ tool: "deep_research" })).toString("base64");
    const decoded = await decodeMessageMetadata(cipher, decryptingResolve);
    expect(decoded?.tool).toBe("deep_research");
  });

  it("drops locked-vault metadata instead of failing conversation load", async () => {
    const lockedResolve = async () => "[Encrypted message]";
    expect(await decodeMessageMetadata("e2e:iv:payload", lockedResolve)).toBeNull();
  });

  it("drops malformed, non-string and shape-invalid metadata", async () => {
    expect(await decodeMessageMetadata("not json {", identityResolve)).toBeNull();
    expect(await decodeMessageMetadata(42, identityResolve)).toBeNull();
    expect(await decodeMessageMetadata(null, identityResolve)).toBeNull();
    // citations entries without a url are filtered; all-invalid → null
    expect(
      await decodeMessageMetadata(JSON.stringify({ citations: [{ nope: true }] }), identityResolve),
    ).toBeNull();
  });
});
