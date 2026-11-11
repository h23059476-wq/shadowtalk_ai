import { motion } from "framer-motion";
import { Clock, Rocket, Users, Zap, Globe, Award, Code } from "lucide-react";

const milestones = [
  { year: "2022", icon: Code, title: "The Spark", desc: "Started learning to code at 15. Built first projects using HTML, CSS, and JavaScript.", color: "text-primary", border: "border-primary/30" },
  { year: "2023", icon: Rocket, title: "ShadowTalk Born", desc: "Launched ShadowTalk AI — a sovereign chatbot with offline-first architecture and privacy guarantees.", color: "text-secondary", border: "border-secondary/30" },
  { year: "2023", icon: Users, title: "SocialSync Launch", desc: "Built SocialSync AI automation hub — acquired 23+ business customers within the first 24 hours.", color: "text-accent", border: "border-accent/30" },
  { year: "2024", icon: Award, title: "Mentorship Recognition", desc: "Recognized by Sir Zia Khan (Governor Sindh IT Initiative) for alignment with Pakistan's tech sovereignty vision.", color: "text-success", border: "border-success/30" },
  { year: "2024", icon: Users, title: "Fatima Joins as Co-Founder", desc: "Fatima joins as Co-Founder & 2nd Developer — architecting the client-side memory ledger, high-performance UI state, and offline pipelines.", color: "text-accent", border: "border-accent/30" },
  { year: "2024", icon: Zap, title: "Offline LLM Engine", desc: "Developed on-device LLM runtime enabling AI inference without any internet connection — true sovereignty.", color: "text-warning", border: "border-warning/30" },
  { year: "2025", icon: Globe, title: "Global Expansion", desc: "Scaling ShadowTalk to serve users across 12+ countries with multi-language support and enterprise features.", color: "text-primary", border: "border-primary/30" },
];

const AboutTimeline = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/5 via-muted/10 to-muted/5" />

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 glass-subtle rounded-full px-5 py-2 mb-6"
          >
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground font-medium">The Journey</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Building in Public
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-muted-foreground">
            From first line of code to sovereign AI infrastructure.
          </motion.p>
        </div>

        <div className="relative">
          {/* Vertical line — draws in on scroll */}
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/60 via-secondary/40 to-accent/30 md:-translate-x-px origin-top"
          />

          <div className="space-y-10">
            {milestones.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`relative flex items-start gap-6 md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                {/* Content */}
                <div className={`flex-1 ml-14 md:ml-0 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className={`glass-subtle rounded-xl p-5 border-l-2 md:border-l-0 ${i % 2 === 0 ? `md:border-r-2 ${m.border}` : `md:border-l-2 ${m.border}`} hover:border-primary/40 transition-all group`}>
                    <span className={`text-xs font-mono font-bold ${m.color} uppercase tracking-widest`}>{m.year}</span>
                    <h3 className="font-bold text-lg mt-1 mb-1">{m.title}</h3>
                    <p className="text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                </div>

                {/* Node */}
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.2, type: "spring", stiffness: 300 }}
                  className="absolute left-6 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-4 ring-background z-10 mt-6 shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                />

                {/* Spacer for alternating layout */}
                <div className="hidden md:block flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutTimeline;
