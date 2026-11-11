import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOUNDER_STORY_CHAPTERS, FOUNDER_STORY_INTRO } from "@/lib/aboutFounderStory";
import { fadeUp, fadeUpStagger, viewportOnce } from "./aboutMotion";

const AboutFounderStory = () => {
  return (
    <section className="py-24 md:py-32 px-4 relative overflow-hidden" id="founder-story">
      <div className="absolute inset-0 about-inspire-grid opacity-30 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={viewportOnce}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[min(100%,640px)] h-[320px] rounded-full bg-primary/8 blur-[100px] pointer-events-none"
      />

      <div className="container mx-auto max-w-3xl relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUpStagger}
          className="text-center mb-16 md:mb-20"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 glass-subtle rounded-full px-5 py-2 mb-6"
          >
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground font-medium">{FOUNDER_STORY_INTRO.badge}</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            {FOUNDER_STORY_INTRO.headline}
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            {FOUNDER_STORY_INTRO.subhead}
          </motion.p>
        </motion.div>

        <div className="space-y-14 md:space-y-20">
          {FOUNDER_STORY_CHAPTERS.map((chapter, i) => (
            <motion.article
              key={chapter.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ delay: 0.05, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="flex gap-4 md:gap-6">
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary border border-primary/25">
                    {i + 1}
                  </span>
                  {i < FOUNDER_STORY_CHAPTERS.length - 1 && (
                    <div className="w-px flex-1 min-h-[3rem] mt-2 bg-gradient-to-b from-primary/40 to-transparent" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pb-2">
                  <h3 className="text-xl md:text-2xl font-bold mb-4 tracking-tight">{chapter.title}</h3>
                  <div className="space-y-4">
                    {chapter.body.map((paragraph, p) => (
                      <p key={p} className="text-muted-foreground leading-relaxed text-base md:text-[1.05rem]">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {chapter.pullQuote && (
                    <motion.blockquote
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={viewportOnce}
                      transition={{ delay: 0.15 }}
                      className="mt-6 glass-subtle rounded-xl p-5 md:p-6 border-l-4 border-primary/50 not-italic"
                    >
                      <Quote className="h-4 w-4 text-primary mb-2 opacity-80" />
                      <p className="text-foreground font-medium text-lg leading-snug">
                        &ldquo;{chapter.pullQuote}&rdquo;
                      </p>
                      {chapter.pullQuoteAuthor && (
                        <footer className="mt-3 text-sm text-muted-foreground">— {chapter.pullQuoteAuthor}</footer>
                      )}
                    </motion.blockquote>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          className="mt-16 md:mt-20 text-center glass-subtle rounded-2xl p-8 md:p-10 border border-border/50"
        >
          <div className="max-w-2xl mx-auto mb-8">
            <h3 className="text-2xl font-bold mb-4">Meet the Founder</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Zain Ahmed is a 17-year-old developer from Karachi who built ShadowTalk AI from the ground up. Driven by a passion for privacy and autonomous AI, he created a platform where conversations belong to the user, not the server. ShadowTalk is proof that age and location are not limits when you have the vision to build the future.
            </p>
            <div className="flex justify-center gap-4 mb-8">
              <a 
                href="https://www.instagram.com/onlyz_ain1/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span className="text-sm font-medium">Instagram</span>
              </a>
              <a 
                href="https://www.linkedin.com/in/zain-ahmed-917b6b3a6" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
                <span className="text-sm font-medium">LinkedIn</span>
              </a>
            </div>
          </div>
          
          <p className="text-lg md:text-xl font-semibold text-foreground/95 mb-2">
            The shadow founder doesn&apos;t disappear when the light comes.
          </p>
          <p className="text-muted-foreground mb-6">He becomes the one who built the light.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/chatbot">Try ShadowTalk free</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/founder-access?plan=pro">Support the build · Pro Rs 1,499</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutFounderStory;
