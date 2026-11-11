import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const projects = [
  { title: "ShadowTalk AI", desc: "Agentic AI workspace with multi-model support, E2EE chat, and deep research pipelines.", badge: "Founder & Lead Developer", status: "Live" },
  { title: "SocialSync", desc: "AI-powered social media automation hub serving 23+ businesses with autonomous content distribution.", badge: "Architect & Creator", status: "Live" },
  { title: "ShadowVault", desc: "Client-side encrypted storage with local-first data management and cross-device sync.", badge: "Lead Engineer", status: "Beta" },
  { title: "Offline LLM Engine", desc: "On-device large language model runtime enabling AI inference without internet (user opt-in).", badge: "Core Developer", status: "Alpha" },
];

const AboutProjects = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/5 via-muted/10 to-muted/5" />
      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Project Credits</h2>
          <p className="text-muted-foreground">Shipping real products, not slide decks.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {projects.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -5, transition: { type: "spring", stiffness: 400 } }}
            >
              <Card className="h-full border-border/50 hover:border-primary/20 transition-all hover:shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.1)] group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg text-primary">{p.title}</h3>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${
                        p.status === "Live"
                          ? "border-success/40 text-success"
                          : p.status === "Beta"
                          ? "border-warning/40 text-warning"
                          : "border-muted-foreground/40 text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-border/50">{p.badge}</Badge>
                    <ExternalLink className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutProjects;
