import { Bot, Mail, Globe, Shield, FileText, ArrowUpRight } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/socialLinks";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import NewsletterSubscription from "./NewsletterSubscription";
import { BRAND, LANDING_COPY } from "@/lib/brand";
import { useLandingMotionContext } from "@/components/landing/LandingMotionProvider";
import LandingAnimate from "@/components/landing/LandingAnimate";
import LandingStagger from "@/components/landing/LandingStagger";
import LandingAmbientOrb from "@/components/landing/LandingAmbientOrb";

const Footer = () => {
  const { hoverLift, isMobile, profile } = useLandingMotionContext();

  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "/home#features" },
        { name: "Pricing", href: "/pricing" },
        { name: "Chatbot", href: "/chatbot" },
        { name: "Changelog", href: "/changelog" },
        { name: "Download desktop", href: "/downloads" },
      ],
    },
    {
      title: "Guides",
      links: [
        { name: "All guides", href: "/guides" },
        { name: "Offline AI chat", href: "/offline-ai-chat" },
        { name: "Private AI chat", href: "/private-ai-chat" },
        { name: "Run an LLM in your browser", href: "/run-llm-in-browser" },
        { name: "What is on-device AI", href: "/what-is-on-device-ai" },
        { name: "Best offline AI chat", href: "/best-offline-ai-chat" },
        { name: "AI chat without an account", href: "/ai-chat-without-account" },
        { name: "Free AI chat", href: "/free-ai-chat" },
        { name: "BYOK AI chat — use your own key", href: "/byok-ai-chat" },
        { name: "Offline AI on your phone", href: "/mobile-offline-ai" },
        { name: "WebGPU AI chat", href: "/webgpu-ai-chat" },
        { name: "Local vs cloud AI", href: "/local-vs-cloud-ai" },
        { name: "AI chat for travel", href: "/ai-chat-for-travel" },
        { name: "AI chat for students", href: "/ai-chat-for-students" },
        { name: "Who can read your AI chats", href: "/who-can-read-your-ai-chats" },
        { name: "Is ChatGPT Plus worth it", href: "/is-chatgpt-plus-worth-it" },
        { name: "ChatGPT down playbook", href: "/chatgpt-down" },
      ],
    },
    {
      title: "Compare",
      links: [
        { name: "All comparisons", href: "/compare" },
        { name: "vs ChatGPT", href: "/vs/chatgpt" },
        { name: "vs Gemini", href: "/vs/gemini" },
        { name: "vs Claude", href: "/vs/claude" },
        { name: "vs LM Studio", href: "/vs/lm-studio" },
        { name: "vs Proton Lumo", href: "/vs/proton-lumo" },
        { name: "vs web-llm-chat", href: "/vs/web-llm-chat" },
        { name: "vs Ollama", href: "/vs/ollama" },
        { name: "vs Jan", href: "/vs/jan" },
        { name: "vs Perplexity", href: "/vs/perplexity" },
        { name: "vs PocketPal", href: "/vs/pocketpal" },
        { name: "vs DeepSeek", href: "/vs/deepseek" },
        { name: "vs Microsoft Copilot", href: "/vs/copilot" },
        { name: "vs DuckDuckGo AI", href: "/vs/duckduckgo-ai" },
        { name: "vs Brave Leo", href: "/vs/brave-leo" },
        { name: "vs Grok", href: "/vs/grok" },
        { name: "vs Poe", href: "/vs/poe" },
      ],
    },
    {
      title: "Support",
      links: [
        { name: "Docs", href: "/docs" },
        { name: "FAQ", href: "/faq" },
        { name: "Contact", href: "/contact" },
        { name: "Status", href: "/status" },
        { name: "Security", href: "/security" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About", href: "/about" },
        { name: "Founder (Zain Ahmed)", href: "/founder" },
        { name: "Benchmarks", href: "/benchmarks" },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy Policy", href: "/privacy" },
        { name: "Terms of Service", href: "/terms" },
        { name: "Cookie Policy", href: "/cookies" },
        { name: "GDPR", href: "/gdpr" },
      ],
    },
  ];

  const socials = [
    ...SOCIAL_LINKS,
    { icon: Mail, href: "mailto:shadowtalk@shadowtalk-ai.com", label: "Email" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-border/50">
      <LandingAmbientOrb
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${
          isMobile ? "w-[400px] h-[160px] blur-[80px]" : "w-[800px] h-[300px] blur-[150px]"
        } bg-primary/5 rounded-full`}
        animate={{ opacity: [0.03, 0.08, 0.03] }}
        duration={10}
      />

      <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-8 sm:gap-10 mb-12 sm:mb-14">
          <LandingAnimate preset="slideLeft" className="lg:col-span-2">
            <div className="flex items-center space-x-2.5 mb-5 sm:mb-6">
              <div className="relative">
                <Bot className="h-7 w-7 text-primary" />
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full pulse-dot"
                  animate={profile.reduced ? undefined : { scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span className="text-lg font-bold gradient-text">{BRAND.fullName}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2 leading-relaxed max-w-xs">{BRAND.shortPitch}</p>
            <p className="text-xs text-muted-foreground/80 mb-3 max-w-xs">{LANDING_COPY.founder.line}</p>
            <p className="text-xs font-semibold text-foreground/80 mb-2">Follow Us</p>
            <LandingStagger className="flex items-center gap-2">
              {socials.map((s, i) => (
                <LandingAnimate key={s.label} preset="pop" index={i} as="div">
                  <motion.a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    whileHover={hoverLift}
                    whileTap={{ scale: 0.95 }}
                    className="w-9 h-9 rounded-lg glass-subtle flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    <s.icon className="h-4 w-4" />
                  </motion.a>
                </LandingAnimate>
              ))}
            </LandingStagger>

            {/* Directory badges — backlink verification embeds (dark theme, verbatim embeds) */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-foreground/80 mb-2">Featured On</p>
              <div className="flex flex-col items-start gap-3">
                <a
                  href="https://launch01.com/projects/shadowtalk-ai?utm_source=badge"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Featured on Launch01"
                  className="inline-block opacity-90 hover:opacity-100 transition-opacity"
                >
                  <img
                    src="https://r2.direasy-multi-tenant.focusapps.app/uploads/616d0b1a-3979-4b8c-94d1-b4f1fedd3ead/1782997259567/w4wbn1tx1uj/featured-on-dark.svg"
                    alt="Featured on Launch01"
                    style={{ height: 44, width: "auto" }}
                    loading="lazy"
                  />
                </a>
                <a
                  href="https://findtop.tools/projects/shadowtalk-ai?utm_source=badge"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Featured on Find Top Tools"
                  className="inline-block opacity-90 hover:opacity-100 transition-opacity"
                >
                  <img
                    src="https://findtop.tools/findtoptools/images/badges/featured-on-dark.svg"
                    alt="Featured on Find Top Tools"
                    style={{ height: 44, width: "auto" }}
                  />
                </a>
                <a
                  href="https://supalaun.ch/projects/shadowtalk-ai?utm_source=badge"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Featured on Supa Launch"
                  className="inline-block opacity-90 hover:opacity-100 transition-opacity"
                >
                  <img
                    src="https://supalaun.ch/supalaunch/images/badges/featured-on-dark.svg"
                    alt="Featured on Supa Launch"
                    style={{ height: 44, width: "auto" }}
                  />
                </a>
              </div>
            </div>
          </LandingAnimate>

          {footerSections.map((section, i) => (
            <LandingAnimate key={section.title} preset="card" index={i}>
              <h3 className="font-semibold text-sm mb-3 sm:mb-4 text-foreground">{section.title}</h3>
              <LandingStagger as="ul" className="space-y-2 sm:space-y-2.5">
                {section.links.map((link, j) => (
                  <LandingAnimate key={link.name} preset="slideLeft" index={j} as="li">
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                    >
                      <motion.span whileHover={{ x: 2 }} className="inline-flex items-center gap-1">
                        {link.name}
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.span>
                    </Link>
                  </LandingAnimate>
                ))}
              </LandingStagger>
            </LandingAnimate>
          ))}
        </div>

        <LandingAnimate preset="fadeUp" className="mb-8 sm:mb-10">
          <NewsletterSubscription />
        </LandingAnimate>

        <LandingAnimate preset="fadeUp">
          <div className="flex flex-col md:flex-row items-center justify-between pt-6 sm:pt-8 border-t border-border/50 gap-4">
            <LandingStagger className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
              <LandingAnimate preset="fadeUp" index={0} as="span">
                © 2026 {BRAND.fullName}. All rights reserved.
              </LandingAnimate>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-start">
                {[
                  { icon: Shield, text: "SOC 2" },
                  { icon: Globe, text: "Global CDN" },
                  { icon: FileText, text: "GDPR" },
                ].map((badge, i) => (
                  <LandingAnimate key={badge.text} preset="pop" index={i + 1} as="span">
                    <span className="flex items-center gap-1.5">
                      <badge.icon className="h-3.5 w-3.5 text-primary" />
                      {badge.text}
                    </span>
                  </LandingAnimate>
                ))}
              </div>
            </LandingStagger>
            <motion.div
              className="flex items-center gap-2 text-xs text-muted-foreground"
              animate={profile.reduced ? undefined : { opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="w-1.5 h-1.5 bg-success rounded-full pulse-dot" />
              <span>All systems operational</span>
            </motion.div>
          </div>
        </LandingAnimate>
      </div>
    </footer>
  );
};

export default Footer;
