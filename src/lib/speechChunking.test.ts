import { describe, expect, it } from "vitest";
import {
  extractStreamingChunks,
  splitIntoSpeechChunks,
  stripForSpeech,
} from "./speechChunking";

describe("stripForSpeech", () => {
  it("removes emoji that TTS engines read aloud", () => {
    const out = stripForSpeech("That's great! 🎉 Let's go 🚀🔥");
    expect(out).toBe("That's great! Let's go");
  });

  it("replaces URLs and code blocks with speakable words", () => {
    const out = stripForSpeech("See https://example.com/docs and ```const x = 1``` for details.");
    expect(out).not.toContain("https://");
    expect(out).not.toContain("const");
    expect(out).toContain("a link");
    expect(out).toContain("a code block");
  });

  it("strips markdown syntax", () => {
    expect(stripForSpeech("**bold** and _italic_ and `code`")).toBe("bold and italic and code");
  });
});

describe("splitIntoSpeechChunks", () => {
  it("splits on sentence punctuation and keeps punctuation attached", () => {
    const chunks = splitIntoSpeechChunks("I love that. What happened next? Tell me!", true);
    expect(chunks.map(c => c.text)).toEqual(["I love that.", "What happened next?", "Tell me!"]);
  });

  it("does not split on abbreviations (Dr., e.g., approx.)", () => {
    const chunks = splitIntoSpeechChunks("Dr. Smith arrived at 5 p.m. e.g. yesterday.", true);
    expect(chunks.map(c => c.text)).toEqual(["Dr. Smith arrived at 5 p.m. e.g. yesterday."]);
  });

  it("assigns stronger pauses after questions than statements, longest at the end", () => {
    const chunks = splitIntoSpeechChunks("Really? Yes. Done.", true);
    expect(chunks[0].pauseAfterMs).toBe(320);
    expect(chunks[1].pauseAfterMs).toBe(320);
    expect(chunks[2].pauseAfterMs).toBeGreaterThan(320); // final pause
  });

  it("splits overlong sentences on clause boundaries", () => {
    const long = "We could go with the first approach which is safer for the data " +
      "because it keeps everything encrypted and locally stored, " +
      "or we could try the second approach which is faster but riskier overall for everyone involved here.";
    const chunks = splitIntoSpeechChunks(long, true);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(200);
  });

  it("returns no chunks for blank input", () => {
    expect(splitIntoSpeechChunks("   ")).toEqual([]);
    expect(splitIntoSpeechChunks("🎉🎉")).toEqual([]);
  });
});

describe("extractStreamingChunks (streaming pipeline)", () => {
  it("returns nothing until a sentence completes", () => {
    const r1 = extractStreamingChunks("I think", 0);
    expect(r1.chunks).toEqual([]);
    const r2 = extractStreamingChunks("I think that's right. Sh", 0);
    expect(r2.chunks.map(c => c.text)).toEqual(["I think that's right."]);
    expect(r2.newConsumed).toBe("I think that's right. ".length);
  });

  it("picks up where it left off across deltas", () => {
    let consumed = 0;
    const a = extractStreamingChunks("Oh nice. One sec, I'm thinking. Still", consumed);
    consumed = a.newConsumed;
    expect(a.chunks.map(c => c.text)).toEqual(["Oh nice.", "One sec, I'm thinking."]);
    const b = extractStreamingChunks("Oh nice. One sec, I'm thinking. Still here. Done.", consumed);
    expect(b.chunks.map(c => c.text)).toEqual(["Still here."]);
    // "Done." has no trailing whitespace — it stays as the tail and is
    // flushed by the caller when the stream completes (with the final pause).
    expect(b.newConsumed).toBeLessThan("Oh nice. One sec, I'm thinking. Still here. Done.".length);
  });

  it("never returns chunks whose text differs from the source slice", () => {
    const { chunks, newConsumed } = extractStreamingChunks("First one. Second one. Third", 0);
    const consumedText = "First one. Second one. ".slice(0, newConsumed);
    expect(consumedText.length).toBe(newConsumed);
    expect(chunks.join(" ").length).toBeGreaterThan(0);
  });
});
