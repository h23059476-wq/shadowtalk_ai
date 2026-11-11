import { motion, useSpring } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal, Mail, Cpu, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export const AboutCoFounderSpotlight = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 400, y: 200 });
  const rotateX = useSpring(0, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 12);
    rotateX.set(-y * 12);
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <section className="py-20 px-4 relative overflow-hidden" id="cofounder-spotlight">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          style={{ perspective: 1200 }}
          className="relative rounded-3xl border border-accent/30 overflow-hidden bg-card/60 backdrop-blur-xl shadow-2xl"
        >
          {/* Ambient Glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300"
            style={{
              background: `radial-gradient(540px circle at ${spot.x}px ${spot.y}px, hsl(var(--accent) / 0.18), transparent 50%)`,
            }}
          />

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 p-8 md:p-12 lg:p-14 relative z-10 items-center">
            {/* Left Column: Systems Bio & Credentials */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="outline" className="border-accent/40 text-accent font-semibold px-3 py-1">
                  Co-Founder &amp; Systems Architect
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Second Developer
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Karachi, Pakistan 🇵🇰
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                Meet <span className="gradient-text">Fatima</span>
              </h2>

              <p className="text-muted-foreground leading-relaxed mb-6 text-base md:text-lg">
                The second developer of ShadowTalk AI. Where Zain pushed the frontier of autonomous agentic models, Fatima engineered the client-side state machine, high-performance UI fluidity, and zero-cloud cryptographic memory ledger.
              </p>

              <div className="grid sm:grid-cols-2 gap-3.5 mb-8">
                {[
                  {
                    icon: Shield,
                    title: "Shadow Memory Ledger",
                    desc: "IndexedDB client ledger with zero server retention.",
                  },
                  {
                    icon: Zap,
                    title: "120 FPS Subtree Engine",
                    desc: "Hardware-composited renders & sub-ms DOM streaming.",
                  },
                  {
                    icon: Cpu,
                    title: "WebGPU Acceleration",
                    desc: "Local on-device browser inference pipelines.",
                  },
                  {
                    icon: Terminal,
                    title: "Offline-First Resilience",
                    desc: "WebWorker caching for uninterrupted workflows.",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="p-3.5 rounded-xl glass-subtle border border-accent/20 hover:border-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <item.icon className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-sm text-foreground">{item.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Button className="btn-glow gap-2 font-semibold" onClick={() => navigate("/fatima")}>
                  Meet Co-Founder Fatima
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="border-border/60 gap-2" asChild>
                  <a href="mailto:shadowtalk@shadowtalk-ai.com">
                    <Mail className="h-4 w-4 text-accent" />
                    shadowtalk@shadowtalk-ai.com
                  </a>
                </Button>
              </div>
            </div>

            {/* Right Column: Interactive 3D Systems Console Card (Zero Images) */}
            <div className="lg:col-span-5 flex justify-center">
              <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="w-full max-w-sm rounded-2xl border-2 border-accent/40 bg-gradient-to-b from-card via-card/95 to-background shadow-2xl p-6 relative overflow-hidden"
              >
                {/* Glow Backdrop */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

                {/* Top Monogram Ribbon */}
                <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/30 via-primary/20 to-accent/40 border border-accent/50 flex items-center justify-center font-black text-xl gradient-text shadow-md">
                      FT
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground leading-none mb-1">Fatima</h4>
                      <p className="text-[11px] font-mono text-accent">DEV #2 · Systems Architect</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                    LIVE
                  </Badge>
                </div>

                {/* Real-Time Telemetry Counters */}
                <div className="space-y-3 mb-5">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-accent" /> Frame Budget
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">120 FPS target</span>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-success" /> Server Retention
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">0% (Client-Only)</span>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-primary" /> Memory Engine
                    </span>
                    <span className="text-xs font-mono font-bold text-primary">IndexedDB Ledger</span>
                  </div>
                </div>

                {/* Interactive Code Snippet */}
                <div className="rounded-lg bg-black/40 border border-border/40 p-3 font-mono text-[11px] text-muted-foreground leading-relaxed">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 border-b border-border/30 pb-1 mb-2">
                    <span>shadow_memory.ts</span>
                    <span className="text-emerald-400">active</span>
                  </div>
                  <p className="text-accent">const ledger = new ShadowMemory({'{'}</p>
                  <p className="pl-3 text-muted-foreground">retention: &quot;zero-server&quot;,</p>
                  <p className="pl-3 text-muted-foreground">targetFPS: 120,</p>
                  <p className="pl-3 text-primary">architect: &quot;Fatima&quot;</p>
                  <p className="text-accent">{'}'});</p>
                </div>

                {/* Bottom Status */}
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Co-Founding Partner</span>
                  <span className="font-semibold text-foreground">Karachi, PK</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutCoFounderSpotlight;
