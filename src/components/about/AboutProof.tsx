import { Card, CardContent } from "@/components/ui/card";
import { Award, Search, Code, MapPin, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const proofCards = [
  {
    icon: Search,
    title: "Search ShadowTalk AI on Google",
    desc: 'Search "shadowtalk ai" — our site and founder profile appear first. Real traction before paid ads.',
    borderColor: "border-l-primary",
    bg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Award,
    title: "A user rated offline access 5/5",
    desc: 'Ejaz rated offline access and UX five stars: "everything I used felt heavy and smooth."',
    borderColor: "border-l-success",
    bg: "bg-success/10",
    iconColor: "text-success",
  },
  {
    icon: Code,
    title: "Engineers take it seriously",
    desc: "An AI & automation engineer reviewed the architecture, said carry on, and offered professional help.",
    borderColor: "border-l-accent",
    bg: "bg-accent/10",
    iconColor: "text-accent",
  },
  {
    icon: MapPin,
    title: "Built in Karachi, used globally",
    desc: "~48% of traffic from the US, ~20% from Pakistan — a 17-year-old founder shipping world-class AI from home.",
    borderColor: "border-l-secondary",
    bg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
];

const AboutProof = () => {
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
            <Award className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground font-medium">The Proof</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold mb-3 tracking-tight"
          >
            Traction you can verify
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Search results, user ratings, and peer recognition — not vanity metrics.
          </motion.p>
        </div>

        <div className="space-y-4">
          {proofCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              whileHover={{ x: 6, transition: { type: "spring", stiffness: 400 } }}
            >
              <Card
                className={`border-l-4 ${card.borderColor} border-border/50 hover:border-border transition-all hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.1)] group`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 ${card.bg} rounded-xl shrink-0`}>
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{card.title}</h3>
                      <p className="text-sm text-muted-foreground">{card.desc}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all shrink-0 mt-1" />
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

export default AboutProof;
