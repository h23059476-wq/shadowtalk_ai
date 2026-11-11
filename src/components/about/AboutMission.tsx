import { Card, CardContent } from "@/components/ui/card";
import { Target, WifiOff, Globe, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, fadeUpStagger, viewportOnce } from "./aboutMotion";

const AboutMission = () => {
  return (
    <section className="py-20 px-4 relative">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUpStagger}
        >
          <motion.div variants={fadeUp}>
          <Card className="glass-subtle border-primary/20 overflow-hidden relative group about-mission-card">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <CardContent className="p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8">
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className="p-3 bg-primary/10 rounded-xl"
                >
                  <Target className="h-6 w-6 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold">The "Why"</h2>
                  <p className="text-sm text-muted-foreground">The Sovereign Mission</p>
                </div>
              </div>

              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                I believe the future of intelligence shouldn't depend on a constant internet connection or a foreign cloud server.
                My mission: <span className="text-primary font-semibold text-glow-pulse">"Intelligence without Internet"</span> — giving every student and business the power of AI on their own terms.
                <span className="block mt-4 text-foreground font-medium">
                  Ejaz, a real user, put it best: offline access with limited data was a good experience — and rated us 5/5.
                </span>
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: WifiOff, title: "Offline-First", desc: "Sovereign AI that works anywhere, anytime" },
                  { icon: Shield, title: "Privacy-Native", desc: "Vault, and optional on-device AI — you choose cloud vs local" },
                  { icon: Globe, title: "Pakistan-Built", desc: "World-class tech from the Global South" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 260 }}
                    className="glass-subtle rounded-xl p-4 flex items-start gap-3 group/card hover:border-primary/30 transition-all"
                  >
                    <item.icon className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutMission;
