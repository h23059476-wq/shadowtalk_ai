import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Flame, Heart, Rocket, Sparkles } from "lucide-react";
import { fadeUp, fadeUpStagger, viewportOnce } from "./aboutMotion";

const ROTATING_WORDS = ["impossible", "too young", "just a student", "from Pakistan", "without funding"];

const PILLARS = [
  {
    icon: Flame,
    title: "Obsession beats age",
    body: "Most people your age are consuming AI. Zain is composing it — systems, products, and a vision most adults never articulate.",
  },
  {
    icon: Rocket,
    title: "Builder, not borrower",
    body: "He didn't wait for permission from a university or a VC. He shipped ShadowTalk, SocialSync, and offline intelligence while the world watched.",
  },
  {
    icon: Heart,
    title: "Mission over hype",
    body: "Every feature points to one idea: your mind should stay yours. Privacy, offline mode— not marketing slogans. Architecture choices.",
  },
  {
    icon: Sparkles,
    title: "Inspiration you can touch",
    body: "This isn't a story on LinkedIn. It's code in production, users in the database, and a teenager proving the Global South builds the future.",
  },
];

const AboutInspire = () => {
  const [wordIndex, setWordIndex] = useState(0);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0.15, 0.45], [80, -40]);
  const opacity = useTransform(scrollYProgress, [0.12, 0.35], [0.4, 1]);

  useEffect(() => {
    const t = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-24 md:py-32 px-4 relative overflow-hidden about-inspire-section">
      <div className="absolute inset-0 about-inspire-grid opacity-40" />
      <motion.div
        style={{ y, opacity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100%,720px)] h-[420px] rounded-full bg-primary/10 blur-[120px] pointer-events-none"
      />

      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUpStagger}
          className="text-center mb-16 md:mb-20"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-[0.35em] text-primary mb-6">
            Read this slowly
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] max-w-4xl mx-auto"
          >
            They said it was{" "}
            <span className="inline-block min-w-[8ch] text-left md:text-center">
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="gradient-text text-glow-pulse inline-block"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </span>
            <br className="hidden sm:block" />
            <span className="text-foreground"> — then </span>
            <span className="gradient-text">Zain Ahmed</span>
            <span className="text-foreground"> built anyway.</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Users rate it <span className="text-foreground font-semibold">5/5</span>. AI builders call it{" "}
            <span className="text-foreground font-semibold">commendable</span>. Engineers offer to help. You are not
            looking at a résumé — you are looking at a product people actually use.
          </motion.p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
          {PILLARS.map((pillar, i) => (
            <motion.article
              key={pillar.title}
              initial={{ opacity: 0, y: 40, rotateX: 8 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={viewportOnce}
              transition={{ delay: i * 0.1, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
              className="about-inspire-card glass-subtle rounded-2xl p-6 md:p-8 border border-border/50 group"
            >
              <motion.div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                whileHover={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.45 }}
              >
                <pillar.icon className="h-6 w-6 text-primary" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2">{pillar.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pillar.body}</p>
            </motion.article>
          ))}
        </div>

        <motion.blockquote
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={viewportOnce}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-16 md:mt-20 text-center max-w-3xl mx-auto"
        >
          <p className="text-2xl md:text-3xl font-semibold italic leading-snug text-foreground/95">
            &ldquo;It&apos;s very nice.. You made it..?&rdquo;
          </p>
          <footer className="mt-6 text-sm text-muted-foreground">— Early ShadowTalk tester, WhatsApp</footer>
        </motion.blockquote>
      </div>
    </section>
  );
};

export default AboutInspire;
