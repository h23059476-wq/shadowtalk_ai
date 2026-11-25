#!/usr/bin/env python3
"""
ShadowTalk AI — zero-cost short-video generator (1080x1920 vertical).

Takes a slug and a JSON array of spoken lines, produces a ready-to-post
vertical short:

  1. edge-tts (free Microsoft neural voices) renders each line to MP3
  2. lines are decoded to PCM and stitched with short breathing pauses,
     giving exact per-line timestamps
  3. an .ass caption file is written — centered lower-third text on a
     subtle dark background box (libass BorderStyle=3)
  4. ffmpeg loops/trims the base screen recording
     (marketing-agent/assets/app_demo.mp4) to the voiceover length,
     scales+cropping to 1080x1920, burns the captions in, mixes the
     voiceover (with a fade-out) and exports H.264/AAC with faststart

If app_demo.mp4 is missing, a placeholder gradient video is generated
automatically so the pipeline never dead-ends.

Usage (matches the n8n "Render Short Video" Execute Command node):
  python marketing-agent/generate_short.py \
      --slug my-post-slug \
      --lines '["line one","line two","line three","line four","line five"]'

Requires: ffmpeg + ffprobe on PATH, `pip install -r requirements.txt`
(edge-tts only). Network needed once per run for the TTS service.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import shutil
import struct
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

VOICE_DEFAULT = "en-US-AndrewNeural"
RATE_DEFAULT = "+4%"
LINE_GAP_SECONDS = 0.35
TARGET_W, TARGET_H = 1080, 1920
SAMPLE_RATE = 24000
CHANNELS = 1
SAMPWIDTH = 2

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = Path(__file__).resolve().parent / "assets"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def check_ffmpeg() -> tuple[str, str]:
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        die("ffmpeg/ffprobe not found on PATH. Install ffmpeg (https://ffmpeg.org) and retry.")
    return ffmpeg, ffprobe


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    print("  $", " ".join(str(c) for c in cmd[:12]) + (" …" if len(cmd) > 12 else ""))
    cmd_str = [str(c) for c in cmd]
    try:
        return subprocess.run(cmd_str, check=True, timeout=kw.pop("timeout", 600), **kw)
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"ffmpeg step timed out: {' '.join(cmd_str[:4])} …")


def ffprobe_duration(ffprobe: str, path: Path) -> float:
    out = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def ensure_base_video(ffmpeg: str, ffprobe: str) -> Path:
    """Return the base vertical screen recording, synthesising a placeholder if absent.

    The placeholder is a dark vignette background — deliberately simple so it
    encodes fast and reliably on every ffmpeg build (animated lavfi sources
    like `gradients` hang or segfault on some hosts). The captions carry the
    visual; replace this file with a real screen recording for production.
    """
    base = ASSETS_DIR / "app_demo.mp4"

    def is_valid(p: Path) -> bool:
        if not (p.exists() and p.stat().st_size > 0):
            return False
        try:
            ffprobe_duration(ffprobe, p)
            return True
        except Exception:  # noqa: BLE001 — partial file from a killed run
            p.unlink(missing_ok=True)
            return False

    if is_valid(base):
        return base

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    print("[generate_short] assets/app_demo.mp4 missing or invalid — generating a 30s placeholder background.")
    print("                 Replace it with your real app screen recording for production videos.")
    run([ffmpeg, "-y", "-f", "lavfi", "-i", f"color=c=#0b101b:s={TARGET_W}x{TARGET_H}:d=30:r=25",
         "-vf", f"vignette=PI/5,format=yuv420p",
         "-frames:v", "750", "-c:v", "libx264", "-preset", "veryfast", str(base)],
        capture_output=True)
    if not is_valid(base):
        die("placeholder generation failed — ffmpeg could not write assets/app_demo.mp4")
    return base


async def tts_lines(lines: list[str], voice: str, rate: str, tmp: Path) -> list[Path]:
    import edge_tts

    paths: list[Path] = []
    for i, text in enumerate(lines, 1):
        out_path = tmp / f"line_{i:02d}.mp3"
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(str(out_path))
        if not out_path.exists() or out_path.stat().st_size == 0:
            raise RuntimeError(f"edge-tts produced no audio for line {i}")
        print(f"[tts] line {i}/{len(lines)} ok ({out_path.stat().st_size} bytes): {text[:48]}…")
        paths.append(out_path)
    return paths


def mp3_to_pcm(ffmpeg: str, mp3: Path, tmp: Path) -> tuple[bytes, float]:
    """Decode an MP3 to 16-bit mono PCM via ffmpeg; return (pcm_bytes, seconds)."""
    wav_path = tmp / (mp3.stem + ".wav")
    run([ffmpeg, "-y", "-i", str(mp3), "-ar", str(SAMPLE_RATE), "-ac", str(CHANNELS),
         "-sample_fmt", "s16", str(wav_path)], capture_output=True)
    with wave.open(str(wav_path), "rb") as w:
        frames = w.readframes(w.getnframes())
    seconds = len(frames) / (SAMPLE_RATE * CHANNELS * SAMPWIDTH)
    return frames, seconds


def build_voiceover(ffmpeg: str, line_mp3s: list[Path], tmp: Path) -> tuple[Path, list[dict]]:
    """Stitch per-line PCM with gaps; return (voiceover_wav, timed_lines)."""
    gap = b"\x00" * int(SAMPLE_RATE * LINE_GAP_SECONDS) * CHANNELS * SAMPWIDTH
    pcm = b""
    timed: list[dict] = []
    cursor = 0.0
    for i, mp3 in enumerate(line_mp3s):
        frames, seconds = mp3_to_pcm(ffmpeg, mp3, tmp)
        start = cursor
        pcm += frames
        cursor += seconds
        timed.append({"index": i + 1, "start": start, "end": cursor})
        if i < len(line_mp3s) - 1:
            pcm += gap
            cursor += LINE_GAP_SECONDS

    voiceover = tmp / "voiceover.wav"
    with wave.open(str(voiceover), "wb") as w:
        w.setnchannels(CHANNELS)
        w.setsampwidth(SAMPWIDTH)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)
    return voiceover, timed


def ass_time(seconds: float) -> str:
    cs = max(0, int(round(seconds * 100)))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def write_ass(timed_lines: list[dict], lines: list[str], path: Path) -> None:
    """libass caption file: bottom-centered text, subtle dark box (BorderStyle=3)."""
    header = f"""[Script Info]
Title: ShadowTalk short — auto captions
ScriptType: v4.00+
WrapStyle: 0
PlayResX: {TARGET_W}
PlayResY: {TARGET_H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Arial,62,&H00FFFFFF,&H00FFFFFF,&H00000000,&H70000000,1,0,0,0,100,100,0,0,3,12,8,2,110,110,430,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for t in timed_lines:
        text = lines[t["index"] - 1].replace("\n", " ").strip()
        # ASS escapes: newline → \N, braces are override blocks
        text = text.replace("{", "(").replace("}", ")")
        events.append(f"Dialogue: 0,{ass_time(t['start'])},{ass_time(t['end'])},Cap,,0,0,0,,{text}")
    path.write_text(header + "\n".join(events) + "\n", encoding="utf-8")


def build_video(ffmpeg: str, base: Path, voiceover: Path, ass_path: Path,
                total: float, out_path: Path) -> None:
    """Loop/trim base to the voiceover length, burn captions, mix audio, export."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fade_start = max(0.0, total - 0.5)
    vf = (
        f"scale={TARGET_W}:{TARGET_H}:force_original_aspect_ratio=increase,"
        f"crop={TARGET_W}:{TARGET_H},"
        f"ass='{ass_path.as_posix()}'"
    )
    run([
        ffmpeg, "-y",
        "-stream_loop", "-1", "-i", str(base),
        "-i", str(voiceover),
        "-t", f"{total:.3f}",
        "-vf", vf,
        "-af", f"afade=t=out:st={fade_start:.3f}:d=0.5",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
        "-movflags", "+faststart",
        str(out_path),
    ])


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a 1080x1920 marketing short with edge-tts + ffmpeg.")
    parser.add_argument("--slug", required=True, help="URL slug of the blog post (output filename)")
    parser.add_argument("--lines", required=True,
                        help='JSON array of spoken lines, e.g. \'["hook","point","cta"]\'')
    parser.add_argument("--voice", default=VOICE_DEFAULT, help=f"edge-tts voice (default {VOICE_DEFAULT})")
    parser.add_argument("--rate", default=RATE_DEFAULT, help=f"speech rate, e.g. +4%% (default {RATE_DEFAULT})")
    args = parser.parse_args()

    slug = args.slug.strip()
    if not slug or "/" in slug or "\\" in slug or ".." in slug:
        die(f"invalid slug: {args.slug!r}")
    try:
        lines_raw = json.loads(args.lines)
    except json.JSONDecodeError as e:
        die(f"--lines is not valid JSON: {e}")
    if isinstance(lines_raw, str):
        lines_raw = [s.strip() for s in lines_raw.splitlines() if s.strip()]
    if not isinstance(lines_raw, list) or len(lines_raw) < 2:
        die("--lines must be a JSON array with at least 2 spoken lines")
    lines = [str(s).strip() for s in lines_raw if str(s).strip()]
    if len(lines) < 2:
        die("at least 2 non-empty spoken lines are required")

    ffmpeg, ffprobe = check_ffmpeg()

    print(f"[generate_short] slug={slug} lines={len(lines)} voice={args.voice}")
    base = ensure_base_video(ffmpeg, ffprobe)

    with tempfile.TemporaryDirectory(prefix="st_short_") as tmp_str:
        tmp = Path(tmp_str)
        print("[generate_short] 1/4 rendering voiceover with edge-tts…")
        try:
            line_mp3s = asyncio.run(tts_lines(lines, args.voice, args.rate, tmp))
        except Exception as e:  # noqa: BLE001 — surface any TTS/network failure clearly
            die(f"edge-tts failed ({type(e).__name__}: {e}). Check internet access to speech.platform.bing.com.")

        print("[generate_short] 2/4 stitching audio and computing line timestamps…")
        voiceover, timed = build_voiceover(ffmpeg, line_mp3s, tmp)
        total = timed[-1]["end"] + 0.6  # small tail before cut

        print("[generate_short] 3/4 writing caption file (.ass)…")
        ass_path = tmp / "captions.ass"
        write_ass(timed, lines, ass_path)

        out_path = OUTPUT_DIR / f"{slug}.mp4"
        print(f"[generate_short] 4/4 encoding final video → {out_path}")
        build_video(ffmpeg, base, voiceover, ass_path, total, out_path)

    duration = ffprobe_duration(ffprobe, out_path)
    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"[generate_short] DONE: {out_path}")
    print(f"[generate_short] duration={duration:.1f}s  size={size_mb:.1f}MB  "
          f"resolution={TARGET_W}x{TARGET_H}  lines={len(timed)}")


if __name__ == "__main__":
    main()
