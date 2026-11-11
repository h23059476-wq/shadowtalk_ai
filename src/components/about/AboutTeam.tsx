import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { SocialLinks } from "@/components/SocialLinks";

const team = [
  {
    name: "Zain Ahmed",
    role: "CEO & Founder",
    avatar: "ZA",
    desc: "17-year-old AI Architect building sovereign intelligence infrastructure from Karachi.",
    tags: ["AI Architecture", "Full-Stack", "Vision"],
    gradient: "from-primary to-secondary",
    link: "/founder",
  },
  {
    name: "Fatima",
    role: "Co-Founder & Systems Architect",
    avatar: "FT",
    desc: "Second developer of ShadowTalk. Engineered client-side memory ledger, high-performance UI state, and offline pipelines.",
    tags: ["Co-Founder", "2nd Developer", "Memory Ledger", "High-Performance UI"],
    gradient: "from-accent to-primary",
    link: "/fatima",
    email: "shadowtalk@shadowtalk-ai.com",
  },
  {
    name: "Community Contributors",
    role: "Open Source Builders",
    avatar: "OS",
    desc: "A growing network of developers, testers, and advocates contributing to the sovereign AI mission.",
    tags: ["Global", "Open Source", "Builders"],
    gradient: "from-secondary to-accent",
  },
];

const AboutTeam = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/5 via-muted/10 to-muted/5" />

      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 glass-subtle rounded-full px-5 py-2 mb-6"
          >
            <Users className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground font-medium">The People</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Team & Collaborators
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-muted-foreground">
            A lean, mission-driven squad building for the next billion.
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {team.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 400 } }}
            >
              <Card className="h-full border-border/50 hover:border-primary/20 transition-all group overflow-hidden">
                <CardContent className="p-6 text-center">
                  {/* Avatar */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.gradient} mx-auto mb-4 flex items-center justify-center`}>
                    <span className="text-xl font-bold text-background">{member.avatar}</span>
                  </div>
                  <h3 className="font-bold text-lg">{member.name}</h3>
                  <p className="text-xs text-primary font-semibold mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground mb-4">{member.desc}</p>
                  <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                    {member.tags.map((tag, j) => (
                      <Badge key={j} variant="outline" className="text-[10px] border-border/40">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {member.name === "Zain Ahmed" && (
                    <SocialLinks
                      className="justify-center gap-2"
                      iconClassName="h-4 w-4"
                      linkClassName="p-2 rounded-lg border border-border/40"
                    />
                  )}
                  {member.link && (
                    <div className="mt-3">
                      <a
                        href={member.link}
                        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View Profile →
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutTeam;
