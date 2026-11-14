import { useEffect, useRef, useState } from "react";

/**
 * LiveOrb — procedural WebGL voice orb (Deep Cobalt / Nebula Indigo).
 *
 * Exact port of the ShadowTalk Live reference shader: 3D simplex-noise fluid
 * sphere with breathing pulse, cobalt/cyan/violet swirls, fresnel rim light,
 * luminous arctic core and atmospheric outer glow on a transparent canvas.
 *
 * Audio-reactivity: `getLevel` (0..1, mic while listening / TTS amplitude
 * while speaking) is passed as the u_level uniform — it scales the breathing
 * amplitude and glow so the orb visibly reacts to live audio without
 * changing the shader's character.
 */

const VERTEX_SHADER = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_level;

// Simplex noise functions for organic fluid movement
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
  float t = u_time * 0.85;

  // Distance from center
  float dist = length(uv);

  // Organic fluid warps using 3D simplex noise
  float angle = atan(uv.y, uv.x);
  float noiseVal = snoise(vec3(uv * 2.2, t * 0.45));
  float noiseDetail = snoise(vec3(uv * 4.8 + vec2(t * 0.2, -t * 0.3), t * 0.7));

  // Breathing pulse radius (amplitude scales with live audio level)
  float breathe = sin(t * 1.4) * 0.03 + cos(t * 2.1) * 0.015 + u_level * 0.05;
  float baseRadius = 0.34 + breathe;

  // Fluid undulating surface distortion
  float surfaceOffset = noiseVal * 0.045 + noiseDetail * 0.02;
  float r = baseRadius + surfaceOffset;

  // Smooth edge mask of the orb
  float edgeSoftness = 0.012;
  float orbMask = smoothstep(r + edgeSoftness, r - edgeSoftness, dist);

  // Deep Cobalt & Nebula Indigo Palette (Gemini Live / Deep Space Aesthetic):
  // Obsidian abyss, deep midnight indigo, electric cobalt sapphire, cyan spark, luminous arctic core
  vec3 cAbyss       = vec3(0.02, 0.04, 0.09); // Deep midnight navy / abyss (#050b18)
  vec3 cMidnight    = vec3(0.06, 0.12, 0.28); // Rich midnight indigo (#0f1f47)
  vec3 cCobalt      = vec3(0.12, 0.42, 0.95); // Radiant electric cobalt blue (#1f6bf2)
  vec3 cElectricCyan = vec3(0.24, 0.82, 0.98); // Vivid celestial cyan highlight (#3dd1fa)
  vec3 cVioletEdge  = vec3(0.48, 0.28, 0.92); // Deep nebula violet resonance (#7a47eb)
  vec3 cLuminousCore= vec3(0.92, 0.96, 1.00); // Luminous arctic star core (#ebf5ff)

  // Fluid swirls inside the sphere
  vec2 warpedUv = uv + vec2(
    snoise(vec3(uv * 3.0, t * 0.5)),
    snoise(vec3(uv * 3.0 + 4.3, t * 0.5))
  ) * 0.18;

  float swirl1 = 0.5 + 0.5 * sin(warpedUv.x * 4.2 + t + snoise(vec3(warpedUv * 2.0, t * 0.3)) * 3.0);
  float swirl2 = 0.5 + 0.5 * cos(warpedUv.y * 5.0 - t * 1.2 + snoise(vec3(warpedUv * 3.0, t * 0.4)) * 2.5);

  // Blend rich cobalt and deep indigo tones with fluid dynamics
  vec3 internalColor = mix(cAbyss, cMidnight, swirl1);
  internalColor = mix(internalColor, cCobalt, swirl2 * 0.88);

  // Violet nebula currents
  float violetSwirl = smoothstep(0.35, 0.75, swirl1 * swirl2 + snoise(vec3(warpedUv * 3.5, t * 0.4)) * 0.3);
  internalColor = mix(internalColor, cVioletEdge, violetSwirl * 0.45);

  // Micro fluid ribbons in electric cyan
  float ribbon = smoothstep(0.42, 0.82, swirl1 * swirl2 + snoise(vec3(warpedUv * 5.0, t * 0.6)) * 0.25);
  internalColor = mix(internalColor, cElectricCyan, ribbon * 0.6);

  // Spherical shading (fresnel + 3D spherical depth)
  float z = sqrt(max(0.0, r * r - dist * dist));
  vec3 normal = normalize(vec3(uv.x, uv.y, z));
  vec3 lightDir = normalize(vec3(-0.35, 0.5, 0.8));
  float diffuse = max(0.0, dot(normal, lightDir));
  float fresnel = pow(1.0 - max(0.0, dot(normal, vec3(0.0, 0.0, 1.0))), 2.4);

  // Soft luminous arctic core highlight
  float coreGlow = smoothstep(0.28, 0.0, dist) * (0.85 + 0.15 * sin(t * 3.0));
  vec3 orbColor = mix(internalColor * (0.65 + 0.55 * diffuse), cLuminousCore, coreGlow * 0.75);
  orbColor += fresnel * mix(cElectricCyan, cVioletEdge, 0.5 + 0.5 * sin(angle + t)) * 0.95;

  // Outer ambient volumetric atmospheric glow in deep cobalt & cyan
  float outerGlow1 = exp(-dist * 4.2) * 0.85;
  float outerGlow2 = exp(-dist * 2.2) * 0.32;
  vec3 atmosphericGlow = mix(cCobalt, cElectricCyan, 0.5 + 0.5 * sin(angle * 2.0 - t * 0.6)) * outerGlow1;
  atmosphericGlow += mix(cMidnight, cLuminousCore, 0.5 + 0.5 * cos(dist * 6.0 - t)) * outerGlow2;

  // Composite final color
  vec3 finalColor = mix(atmosphericGlow, orbColor, orbMask);

  // Alpha transparency for seamless overlay
  float alpha = clamp(orbMask + outerGlow1 * 0.85 + outerGlow2 * 0.45, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, alpha);
}`;

interface LiveOrbProps {
  /** Live audio amplitude 0..1 (mic or TTS). Read per-frame via ref-style getter. */
  getLevel?: () => number;
  className?: string;
}

export const LiveOrb: React.FC<LiveOrbProps> = ({ getLevel, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const getLevelRef = useRef<() => number>(() => 0);
  getLevelRef.current = getLevel ?? (() => 0);
  // WebGL contexts can be lost (GPU process crash, driver reset, resource
  // pressure). Bumping this key remounts the canvas with a brand-new context.
  const [ctxEpoch, setCtxEpoch] = useState(0);
  const lossesRef = useRef({ count: 0, lastAt: 0 });
  const MAX_CONSECUTIVE_LOSSES = 4;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Recover from context loss: cancel the browser's default (dead) restore
    // and remount the canvas. A rapid-loss cap avoids an infinite remount
    // loop on hardware that cannot run the shader at all.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      const now = Date.now();
      const losses = lossesRef.current;
      losses.count = now - losses.lastAt > 2000 ? 1 : losses.count + 1;
      losses.lastAt = now;
      if (losses.count <= MAX_CONSECUTIVE_LOSSES) setCtxEpoch((x) => x + 1);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    // Sync the WebGL drawing-buffer size with the CSS-driven layout size.
    const syncSize = () => {
      const w = canvas.clientWidth || 480;
      const h = canvas.clientHeight || 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
    }
    syncSize();

    const gl = (canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return; // graceful: CSS glow layers still render

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uLevel = gl.getUniformLocation(prog, "u_level");

    // u_mouse is in pixel coordinates matching u_resolution (ShaderToy convention).
    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };
    window.addEventListener("mousemove", onMouseMove);

    let frame: number | null = null;
    const render = (t: number) => {
      if (!resizeObserver) syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      if (uLevel) gl.uniform1f(uLevel, getLevelRef.current());
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      if (resizeObserver) resizeObserver.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [ctxEpoch]);

  return <canvas key={ctxEpoch} ref={canvasRef} className={className ?? "h-full w-full"} style={{ display: "block" }} />;
};

export default LiveOrb;
