import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Braces, Brain, Shield, Cloud, Palette, Server } from "lucide-react";

const skillCategories = [
  {
    icon: Brain,
    title: "AI & Machine Learning",
    skills: [
      { name: "LLM Architecture", level: 92 },
      { name: "Prompt Engineering", level: 95 },
      { name: "On-Device Inference", level: 88 },
      { name: "RAG Pipelines", level: 85 },
    ],
    color: "primary",
  },
  {
    icon: Braces,
    title: "Full-Stack Development",
    skills: [
      { name: "React / TypeScript", level: 94 },
      { name: "Node.js / Deno", level: 88 },
      { name: "ShadowTalk backend / Postgres", level: 90 },
      { name: "REST & GraphQL APIs", level: 86 },
    ],
    color: "secondary",
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    skills: [
      { name: "Zero-Knowledge Encryption", level: 87 },
      { name: "RLS & Auth Systems", level: 91 },
      { name: "SAML / SSO", level: 80 },
      { name: "Data Sovereignty", level: 93 },
    ],
    color: "accent",
  },
  {
    icon: Cloud,
    title: "Infrastructure",
    skills: [
      { name: "Edge Computing", level: 85 },
      { name: "CI/CD Pipelines", level: 82 },
      { name: "PWA Architecture", level: 90 },
      { name: "Offline-First Systems", level: 95 },
    ],
    color: "success",
  },
];

const certifications = [
  "AI Architecture Specialist",
  "Open Source Contributor",
  "Agentic Systems Engineering",
  "Sovereign Systems Design",
];

const AboutSkills = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 glass-subtle rounded-full px-5 py-2 mb-6"
          >
            <Palette className="h-4 w-4 text-secondary" />
            <span className="text-sm text-muted-foreground font-medium">Skills & Expertise</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            The Toolkit
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-muted-foreground">
            Engineering mastery across the full sovereign stack.
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-10">
          {skillCategories.map((cat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className="h-full border-border/50 hover:border-primary/20 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`p-2.5 bg-${cat.color}/10 rounded-xl`}>
                      <cat.icon className={`h-5 w-5 text-${cat.color}`} />
                    </div>
                    <h3 className="font-bold">{cat.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {cat.skills.map((skill, j) => (
                      <div key={j}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{skill.name}</span>
                          <span className="font-mono text-xs text-primary">{skill.level}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${skill.level}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + j * 0.1, duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full bg-gradient-to-r from-${cat.color} to-${cat.color}/60`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Certifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <Server className="h-4 w-4 text-muted-foreground mr-1" />
          <span className="text-sm text-muted-foreground mr-2">Focus Areas:</span>
          {certifications.map((cert, i) => (
            <Badge key={i} variant="outline" className="border-border/50 text-xs">
              {cert}
            </Badge>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSkills;
