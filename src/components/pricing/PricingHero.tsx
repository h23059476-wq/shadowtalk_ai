import { motion } from "framer-motion";
import { Star, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import { heroTitleVariants } from "@/lib/pricingMotion";
import { PRICING_PAGE_HOOK } from "@/lib/conversionCopy";

const PricingHero = () => {
  const { profile, viewport, variants } = useLandingMotion();

  return (
    <section className="pricing-hero relative pt-24 sm:pt-28 pb-10 sm:pb-14 px-4">
      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants.scaleFadeIn}
          className="inline-flex items-center gap-2 glass-subtle rounded-full px-4 py-2 mb-6 border border-primary/20"
        >
          <Star className="h-4 w-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Free access — no subscription</span>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          variants={heroTitleVariants(profile)}
          className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5"
        >
          Free to use.{" "}
          <span className="gradient-text block sm:inline mt-1 sm:mt-0">You bring the key.</span>
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={variants.fadeSlideUp}
          className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8"
        >
          ShadowTalk AI is free to use. Bring your own AI provider API key and
          choose your preferred models. Your provider may charge separately for
          API usage.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants.fadeSlideUp}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/chatbot">Open the workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/settings">
                <KeyRound className="h-4 w-4" /> Add your API key
              </Link>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/90 max-w-lg text-center">{PRICING_PAGE_HOOK}</p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingHero;
