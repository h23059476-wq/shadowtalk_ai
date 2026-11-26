import { describe, it, expect } from "vitest";
import {
  classifyHfError,
  isFatalHfErrorKind,
  isHfWorkerRequest,
  isHfWorkerResponse,
  HF_PROTOCOL_VERSION,
  type HfWorkerRequest,
  type HfWorkerResponse,
} from "../protocol";

describe("classifyHfError — typed error kinds from raw messages", () => {
  it("classifies GPU context loss", () => {
    expect(classifyHfError("WebGPU device was lost")).toBe("gpu-lost");
    expect(classifyHfError("GPUAdapter has been destroyed")).toBe("gpu-lost");
    expect(classifyHfError("the context was lost unexpectedly")).toBe("gpu-lost");
    expect(classifyHfError("Unable to find a compatible GPU adapter")).toBe("gpu-lost");
  });

  it("classifies OOM aborts", () => {
    expect(classifyHfError("Out of memory: allocation failed")).toBe("oom");
    expect(classifyHfError("WASM heap exhausted")).toBe("oom");
    expect(classifyHfError("buffer allocation failed for tensor")).toBe("oom");
  });

  it("classifies download failures", () => {
    expect(classifyHfError("Failed to fetch https://huggingface.co/...")).toBe("download");
    expect(classifyHfError("404 Not Found on model file")).toBe("download");
    expect(classifyHfError("NetworkError when attempting to fetch resource.")).toBe("download");
    expect(classifyHfError("Unrecognized model id")).toBe("download");
  });

  it("classifies unsupported operations", () => {
    expect(classifyHfError("opset operator not supported by wasm backend")).toBe("unsupported");
    expect(classifyHfError("webgpu is not supported in this browser")).toBe("unsupported");
  });

  it("prefers the device classes over weaker matches", () => {
    // 'gpu' words win over 'fetch' inside the same message
    expect(classifyHfError("fetch failed because the GPU adapter was destroyed")).toBe("gpu-lost");
  });

  it("falls back to unknown", () => {
    expect(classifyHfError("something exploded")).toBe("unknown");
    expect(classifyHfError("")).toBe("unknown");
    expect(classifyHfError(null)).toBe("unknown");
    expect(classifyHfError(undefined)).toBe("unknown");
  });
});

describe("isFatalHfErrorKind — respawn ladder membership", () => {
  it("gpu-lost and oom are fatal", () => {
    expect(isFatalHfErrorKind("gpu-lost")).toBe(true);
    expect(isFatalHfErrorKind("oom")).toBe(true);
  });

  it("download/unsupported/unknown are not fatal", () => {
    expect(isFatalHfErrorKind("download")).toBe(false);
    expect(isFatalHfErrorKind("unsupported")).toBe(false);
    expect(isFatalHfErrorKind("unknown")).toBe(false);
  });
});

describe("isHfWorkerRequest — postMessage boundary guard", () => {
  it("accepts valid requests", () => {
    const requests: HfWorkerRequest[] = [
      { type: "init", id: "a1", payload: { task: "feature-extraction", model: "x/y" } },
      { type: "embed", id: "a2", payload: { texts: ["hi"] } },
      { type: "transcribe", id: "a3", payload: { audio: new Float32Array(8) } },
      { type: "chat", id: "a4", payload: { messages: [{ role: "user", content: "hi" }] } },
      { type: "chat-abort", id: "a4", payload: {} },
      { type: "reset", id: "a5", payload: {} },
    ];
    for (const request of requests) expect(isHfWorkerRequest(request)).toBe(true);
  });

  it("rejects malformed payloads", () => {
    expect(isHfWorkerRequest(null)).toBe(false);
    expect(isHfWorkerRequest("chat")).toBe(false);
    expect(isHfWorkerRequest({ type: "chat", payload: { messages: [] } })).toBe(false); // no id
    expect(isHfWorkerRequest({ type: "chat", id: "x", payload: { messages: "no" } })).toBe(false);
    expect(isHfWorkerRequest({ type: "embed", id: "x", payload: { texts: 42 } })).toBe(false);
    expect(isHfWorkerRequest({ type: "transcribe", id: "x", payload: { audio: [1, 2] } })).toBe(false);
    expect(isHfWorkerRequest({ type: "init", id: "x", payload: { task: 1, model: "m" } })).toBe(false);
    expect(isHfWorkerRequest({ type: "shapeshift", id: "x", payload: {} })).toBe(false);
  });
});

describe("isHfWorkerResponse — response guard", () => {
  it("accepts valid responses", () => {
    const responses: HfWorkerResponse[] = [
      { type: "ready", id: "a1", payload: { task: "text-generation", model: "m", device: "wasm", downgraded: false } },
      { type: "progress", id: "a1", payload: { status: "download", progress: 0.5 } },
      { type: "delta", id: "a1", payload: { text: "he" } },
      { type: "result", id: "a1", payload: { text: "hello", model: "m", device: "wasm" } },
      { type: "error", id: "a1", payload: { kind: "gpu-lost", message: "device lost" } },
      { type: "engine-status", id: "engine", payload: { state: "ready", device: "wasm", detail: "" } },
    ];
    for (const response of responses) expect(isHfWorkerResponse(response)).toBe(true);
  });

  it("rejects malformed responses", () => {
    expect(isHfWorkerResponse({ type: "result", payload: {} })).toBe(false); // no id
    expect(isHfWorkerResponse({ type: "result", id: "x", payload: null })).toBe(false);
    expect(isHfWorkerResponse({ type: "teleport", id: "x", payload: {} })).toBe(false);
    expect(isHfWorkerResponse(42)).toBe(false);
  });
});

describe("protocol version", () => {
  it("is pinned so client and worker builds stay compatible", () => {
    expect(HF_PROTOCOL_VERSION).toBe(1);
  });
});
