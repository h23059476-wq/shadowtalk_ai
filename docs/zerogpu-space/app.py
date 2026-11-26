# ShadowTalk AI — stateless ZeroGPU image Space (2-minute deploy template)
#
# What this is
#   A minimal, stateless, ZERO-LOG Gradio Space that runs FLUX.1-schnell on
#   Hugging Face's free ZeroGPU H200 pool. ShadowTalk's browser client
#   (src/lib/providers/zeroGpuSpaceProvider.ts) talks to it directly through
#   @gradio/client — no backend, no database, no request logging.
#
# Deploy it in 2 minutes
#   1. Create a Space on https://huggingface.co/new-space
#      - SDK: Gradio, Hardware: ZeroGPU (free), Visibility: Public or Private.
#   2. Upload this file as app.py and requirements.txt as requirements.txt.
#   3. That's it — the Space URL is your Space ID ("username/my-space").
#      Point ShadowTalk at it via VITE_ZERO_GPU_SPACE_ID, or pass it as the
#      `spaceId` option to generateImageViaZeroGpu().
#
# Why ZeroGPU
#   @spaces.GPU gives each call a burst of H200 time without you paying for
#   a dedicated GPU. Users with an HF token get their own personal daily
#   quota + queue priority; anonymous visitors get the free shared quota.
#
# Privacy contract
#   - No prompt/image persistence: outputs stay in the HTTP response only.
#   - No analytics, no logging, no Gradio run history (see launch() below).
#   - The Space keeps no state between requests (function-local everything).

import os

import gradio as gr
import spaces  # noqa: F401  (provided by the ZeroGPU runtime — only exists on HF Spaces)
import torch
from diffusers import FluxPipeline

MODEL_ID = "black-forest-labs/FLUX.1-schnell"
MAX_SEED = 2**32 - 1
DEFAULT_STEPS = 4  # schnell is distilled for 1–4 steps
MAX_STEPS = 4
MAX_SIZE = 2048

# ── One-time load: pipeline lives in RAM, never touches disk persistence ──
dtype = torch.bfloat16
pipe = FluxPipeline.from_pretrained(MODEL_ID, torch_dtype=dtype)


@spaces.GPU(duration=55)  # generous burst for 4-step @ 1024², includes queue overhead
def infer(prompt: str, seed: int, randomize_seed: bool, width: int, height: int, num_inference_steps: int):
    if not prompt or not prompt.strip():
        raise gr.Error("Describe the image you want to generate.")
    width = max(256, min(int(width), MAX_SIZE))
    height = max(256, min(int(height), MAX_SIZE))
    num_inference_steps = max(1, min(int(num_inference_steps), MAX_STEPS))
    seed = int(seed) if not randomize_seed else __import__("random").randint(0, MAX_SEED)
    generator = torch.Generator(device="cuda").manual_seed(seed)

    image = pipe(
        prompt=prompt.strip(),
        width=width,
        height=height,
        num_inference_steps=num_inference_steps,
        generator=generator,
    ).images[0]
    # No disk writes, no telemetry — the image leaves as the HTTP response.
    return image, seed


examples = [
    "photorealistic portrait of a mountain guide at golden hour, 85mm lens, shallow depth of field",
    "macro photo of a dew-covered dragonfly wing, iridescent, extreme detail",
    "cinematic shot of a neon-lit ramen stall in rainy Tokyo, reflections on wet asphalt",
]

with gr.Blocks(title="ShadowTalk raster engine") as demo:
    gr.Markdown("## ShadowTalk AI raster engine\nFLUX.1-schnell on ZeroGPU — stateless, zero-log.")
    with gr.Row():
        prompt = gr.Text(label="Prompt", show_label=False, placeholder="Describe the image…", max_lines=3)
    with gr.Row():
        seed = gr.Slider(minimum=0, maximum=MAX_SEED, step=1, value=0, label="Seed")
        randomize_seed = gr.Checkbox(value=True, label="Randomize seed")
    with gr.Row():
        width = gr.Slider(minimum=256, maximum=MAX_SIZE, step=32, value=1024, label="Width")
        height = gr.Slider(minimum=256, maximum=MAX_SIZE, step=32, value=1024, label="Height")
        num_inference_steps = gr.Slider(minimum=1, maximum=MAX_STEPS, step=1, value=DEFAULT_STEPS, label="Steps")
    run = gr.Button("Generate", variant="primary")
    output_image = gr.Image(label="Result", show_label=False, format="png")
    output_seed = gr.Number(label="Seed used", precision=0)

    run.click(
        fn=infer,
        inputs=[prompt, seed, randomize_seed, width, height, num_inference_steps],
        outputs=[output_image, output_seed],
        api_name="infer",  # exposes POST /infer — the endpoint ShadowTalk calls
        concurrency_limit=1,
    )
    gr.Examples(examples=examples, inputs=[prompt])

# run_history=False disables Gradio's browser-local call history; combined
# with the function-local state above the Space stays stateless and zero-log.
demo.launch(ssr_mode=False, run_history=False, pwa=False)
