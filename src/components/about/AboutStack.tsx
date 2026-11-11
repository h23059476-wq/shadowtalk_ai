import { Card, CardContent } from "@/components/ui/card";
import { Layers, Rocket, WifiOff, TrendingUp, Cpu, Zap, Database } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stackCards = [
  { icon: Rocket, title: "Infrastructure", desc: "Built and scaled using ShadowTalk Pro for rapid deployment and clean, private code architecture.", color: "from-primary/20 to-primary/5" },
  { icon: WifiOff, title: "Offline Core", desc: "Sovereign engine utilizing local inference to run LLMs in Airplane Mode.", color: "from-secondary/20 to-secondary/5" },
  { icon: TrendingUp, title: "Growth Engine", desc: "SocialSync AI automation hub — 23 customers in its first 24 hours.", color: "from-accent/20 to-accent/5" },
  { icon: Cpu, title: "Edge Computing", desc: "On-device model execution for zero-latency AI responses without cloud dependency.", color: "from-success/20 to-success/5" },
  { icon: Zap, title: "Real-Time Sync", desc: "Instant collaboration with conflict-free data merging across distributed nodes.", color: "from-warning/20 to-warning/5" },
  { icon: Database, title: "Knowledge Vault", desc: "Encrypted local-first knowledge base with semantic search and RAG pipeline.", color: "from-primary/15 to-secondary/10" },
];

const AboutStack = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/5 via-muted/10 to-muted/5" />
      <div className="absolute inset-0 bg-grid-dense opacity-15" />

      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 glass-subtle rounded-full px-5 py-2 mb-6"
          >
            <Layers className="h-4 w-4 text-secondary" />
            <span className="text-sm text-muted-foreground font-medium">The Stack</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            How I Play
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-muted-foreground max-w-lg mx-auto">
            I don't just "prompt" — I engineer full sovereign systems.
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stackCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 400 } }}
            >
              <Card className="h-full border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_15px_50px_-15px_hsl(var(--primary)/0.12)] group overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <CardContent className="p-6 text-center relative z-10">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="p-4 bg-muted/60 rounded-2xl w-fit mx-auto mb-4 group-hover:bg-muted transition-colors"
                  >
                    <card.icon className="h-7 w-7 text-primary" />
                  </motion.div>
                  <h3 className="font-bold mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutStack;
