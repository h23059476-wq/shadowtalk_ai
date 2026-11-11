let viralCount = 0;

export function buildInAppSharePayload(): {
  text: string;
  url: string;
  utm: { source: string; medium: string; campaign: string };
} {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.shadowtalk-ai.com";
  const url = new URL(base + "/chatbot");
  url.searchParams.set("utm_source", "in-app-share");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "viral_chat");
  viralCount += 1;
  return {
    text: `I'm using ShadowTalk AI - local, private, free`,
    url: url.toString(),
    utm: { source: "in-app-share", medium: "social", campaign: "viral_chat" },
  };
}

export function getViralShareLinks(payload: ReturnType<typeof buildInAppSharePayload>) {
  const encodedText = encodeURIComponent(payload.text);
  const encodedUrl = encodeURIComponent(payload.url);
  return {
    copy: `${payload.text} ${payload.url}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };
}

/**
 * Build a shareable URL for a multi-model consensus result.
 *
 * The URL points to /s/<base64-encoded-payload> — a public SharedAnswerPage
 * that renders the prompt + all model responses in read-only mode. The
 * payload is base64-encoded JSON (NOT encrypted — these are public shares).
 *
 * Always includes UTM params so we can track viral consensus shares in GA.
 */
export function buildConsensusSharePayload(payload: {
  prompt: string;
  responses: Array<{ model: string; provider: string; response: string; latencyMs?: number }>;
  timestamp: string;
}): { url: string; utm: { source: string; medium: string; campaign: string }; footer: string } {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.shadowtalk-ai.com";

  // Compact payload for URL — strip latency, keep model + provider + truncated response
  const compact = {
    p: payload.prompt.slice(0, 2000),
    r: payload.responses.map((r) => ({
      m: r.model,
      pr: r.provider,
      // Truncate to 4000 chars per response to keep URL length sane
      t: r.response.slice(0, 4000),
    })),
    ts: payload.timestamp,
    v: 1, // payload version
  };

  // Base64url encode (UTF-8 safe)
  const json = JSON.stringify(compact);
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf-8").toString("base64");
  const b64url = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const url = new URL(base + "/s/" + b64url);
  url.searchParams.set("utm_source", "consensus-share");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "viral_consensus");

  return {
    url: url.toString(),
    utm: { source: "consensus-share", medium: "social", campaign: "viral_consensus" },
    footer:
      "Powered by ShadowTalk AI (Zero-Knowledge BYOK Canvas) · shadowtalk-ai.com",
  };
}

/**
 * Footer text for embedding in exported artifacts (PNGs, PDFs, code snippets).
 * Consistent across all viral surfaces.
 */
export const SHADOWTALK_VIRAL_FOOTER =
  "Powered by ShadowTalk AI (Zero-Knowledge BYOK Canvas) · shadowtalk-ai.com";

/**
 * Build a "Powered by ShadowTalk" footer block for embedding in shared code
 * snippets (e.g. when a user exports a code block from the workspace).
 *
 * Returns a string with the footer formatted as a comment block in the
 * detected language style (// for JS/Go, # for Python/Ruby, <!-- --> for HTML).
 */
export function buildSnippetFooter(language: "js" | "py" | "html" | "md" | "txt" = "txt"): string {
  const text = SHADOWTALK_VIRAL_FOOTER;
  switch (language) {
    case "js":
      return `// ${text}`;
    case "py":
      return `# ${text}`;
    case "html":
      return `<!-- ${text} -->`;
    case "md":
      return `> _${text}_`;
    case "txt":
    default:
      return text;
  }
}

export function getViralShareCount(): number {
  return viralCount;
}
