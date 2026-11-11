import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND, BRAND_PILLARS, BRAND_TRACTION } from "@/lib/brand";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { formatTractionDaily, formatTractionUsers } from "@/lib/formatMetrics";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import LandingInteractiveCard from "@/components/landing/LandingInteractiveCard";

/**
 * "What is ShadowTalk AI?" — trust + value-prop section shown directly under the hero.
 * Answers the newcomer question in one screen: what it is, why it's different,
 * live traction, and where to go for legitimacy signals (About / Contact).
 */
const WhatIsShadowTalk = () => {
  const { hoverLift, variants, viewport } = useLandingMotion();
  const metrics = usePlatformMetrics();

  const usersLabel = metrics.isLoading
    ? BRAND_TRACTION.usersLabel
    : formatTractionUsers(metrics.totalUsers);
  const dailyLabel = metrics.isLoading
    ? BRAND_TRACTION.dailyLabel
    : formatTractionDaily(metrics.dailyActiveUsers);

  return (
    <section
      id="what-is-shadowtalk"
      className="relative py-16 sm:py-24 bg-background overflow-hidden"
      aria-labelledby="what-is-shadowtalk-title"
    >
      <div className="absolute inset-0 bg-grid-dense opacity-20" aria-hidden />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <LandingSectionHeader
          badge="The Difference"
          badgeIcon={Sparkles}
          title={
            <>
              An AI workspace that <span className="gradient-text">executes missions</span>, not just replies.
            </>
          }
          subtitle={
            <>
              Because standard chatbots stop at answering questions. ShadowTalk <strong>finishes the job</strong>. When you need to research a topic, write a script, run the code, and format the output — ShadowTalk's autonomous agent does it all in a unified workspace terminal.
            </>
          }
          className="mb-10 sm:mb-14"
        />

        {/* Live traction strip — real numbers pulled from platform metrics */}
        <motion.div
          variants={variants.fadeSlideUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="mx-auto mb-10 sm:mb-14 max-w-3xl"
        >
          <div className="glass-subtle border border-border/50 rounded-2xl px-5 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <Users className="h-5 w-5 text-primary shrink-0" aria-hidden />
              <div>
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  {usersLabel} · {dailyLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  Live workspace metrics — not a landing-page vanity counter.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
              <span>Founder-led · Free to use · BYOK</span>
            </div>
          </div>
        </motion.div>

        {/* Differentiators — what makes ShadowTalk different */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto mb-10 sm:mb-14">
          {BRAND_PILLARS.map((pillar, i) => (
            <LandingInteractiveCard key={pillar.title} index={i}>
              <Card className="h-full border-border/50 bg-card/40">
                <CardContent className="p-5 sm:p-6">
                  <div
                    className="text-3xl mb-3 select-none"
                    role="img"
                    aria-label={pillar.title}
                  >
                    {pillar.emoji}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-base sm:text-lg">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pillar.description}
                  </p>
                </CardContent>
              </Card>
            </LandingInteractiveCard>
          ))}
        </div>

        {/* Legitimacy CTAs — About + Contact + Docs */}
        <motion.div
          variants={variants.fadeSlideUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Built by a real founder. Read the story, see what shipped, or reach out directly.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Button asChild variant="default" size="sm" className="btn-glow">
              <Link to="/about" aria-label="Learn about ShadowTalk">
                About {BRAND.name}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/contact">Contact the founder</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/discover">See what ships (changelog)</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <a href="#features">Feature highlights ↓</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatIsShadowTalk;
