import { describe, it, expect } from "vitest";
import { getModelCapabilities } from "@/lib/capabilityRegistry";
import { classifyModel } from "@/lib/capabilityInference";

describe("BYOK capability profile is model-specific", () => {
  it("Gemini 'models/' ids resolve to a real profile with a known context window", () => {
    const caps = getModelCapabilities("gemini", "models/gemini-3.1-flash-lite");
    expect(caps.contextWindow).toBe(1_048_576);
    expect(caps.imageInput.status).toBe("supported");
  });

  it("different models of one provider get different profiles", () => {
    const vision = getModelCapabilities("groq", "meta-llama/llama-4-scout-17b-16e-instruct");
    const text = getModelCapabilities("groq", "llama-3.1-8b-instant");
    expect(vision.imageInput.status).toBe("supported");
    expect(text.imageInput.status).toBe("unsupported");
  });

  it("non-chat models are hidden from the chat picker", () => {
    expect(classifyModel("models/text-embedding-004")).toBe("embedding");
    expect(classifyModel("whisper-large-v3")).toBe("audio");
    expect(classifyModel("gemini-2.5-pro")).toBe("chat");
  });
});
