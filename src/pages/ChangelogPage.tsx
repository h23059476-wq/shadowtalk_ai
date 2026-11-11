import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Bug,
  Zap,
  Shield,
  Calendar,
  Tag,
  ChevronDown,
  ChevronUp,
  Rocket,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PRODUCT_CHANGELOG } from "@/content/productChangelog";
import { useChangelogEntries } from "@/hooks/useCMSContent";
import { format, parseISO } from "date-fns";
import { SEOHead } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  mergeChangelogWithCms,
  type ChangelogChangeType,
  type ProductChangelogEntry,
} from "@/content/productChangelog";
import { FloatingOrbs } from "@/components/motion/FloatingOrbs";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.06, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const getChangeIcon = (type: ChangelogChangeType) => {
  switch (type) {
    case "feature":
      return <Sparkles className="h-4 w-4 text-primary" />;
    case "improvement":
      return <Zap className="h-4 w-4 text-secondary" />;
    case "bugfix":
      return <Bug className="h-4 w-4 text-destructive" />;
    case "security":
      return <Shield className="h-4 w-4 text-accent" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
};

const getChangeBadge = (type: ChangelogChangeType) => {
  switch (type) {
    case "feature":
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">New</Badge>
      );
    case "improvement":
      return (
        <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-[10px]">
          Improved
        </Badge>
      );
    case "bugfix":
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
          Fixed
        </Badge>
      );
    case "security":
      return (
        <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">Security</Badge>
      );
    default:
      return null;
  }
};

function formatPublished(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

const ChangelogPage = () => {
  const navigate = useNavigate();
  const { entries: cmsEntries, isLoading } = useChangelogEntries();

  const entries = useMemo(
    () => mergeChangelogWithCms(cmsEntries ?? []),
    [cmsEntries],
  );

  const [expandedVersions, setExpandedVersions] = useState<string[]>([]);

  useEffect(() => {
    if (entries[0] && expandedVersions.length === 0) {
      setExpandedVersions([entries[0].version]);
    }
  }, [entries, expandedVersions.length]);

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) =>
      prev.includes(version) ? prev.filter((v) => v !== version) : [...prev, version],
    );
  };

  const renderEntry = (entry: ProductChangelogEntry & { id?: string }, index: number) => {
    const isExpanded = expandedVersions.includes(entry.version);
    const isLatest = index === 0;

    return (
      <motion.div
        key={entry.id ?? entry.version}
        custom={index}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <SpotlightCard className="h-full">
        <Card className="card-glass relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute left-[19px] top-7 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)] hidden md:block transform -translate-x-1/2 z-10" />

          <CardHeader
            className="cursor-pointer md:ml-10 relative z-10"
            onClick={() => toggleVersion(entry.version)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="font-mono glass-subtle border-primary/20 text-primary">
                  <Tag className="h-3 w-3 mr-1" />v{entry.version}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatPublished(entry.publishedAt)}
                </div>
                {isLatest && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    Latest
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 shrink-0" type="button">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardTitle className="text-lg mt-2 tracking-tight group-hover:text-primary transition-colors">
              {entry.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{entry.summary}</p>
            {!isExpanded && entry.changes.length > 0 && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                {entry.changes.length} change{entry.changes.length === 1 ? "" : "s"} — tap to expand
              </p>
            )}
          </CardHeader>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <CardContent className="md:ml-10 pt-0 relative z-10 space-y-2">
                  {entry.changes.map((change, ci) => (
                    <motion.div
                      key={ci}
                      className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-muted/30 transition-colors text-sm"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + ci * 0.03, duration: 0.2 }}
                    >
                      <span className="mt-0.5 shrink-0">{getChangeIcon(change.type)}</span>
                      <span className="flex-1 text-foreground/90">{change.text}</span>
                      {getChangeBadge(change.type)}
                    </motion.div>
                  ))}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {entry.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] border-border/30">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        </SpotlightCard>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        meta={{
          title: 'Product Changelog & Release Notes — ShadowTalk AI',
          description: 'Track every ShadowTalk AI update: OmniRoute gateway integration, PWA offline support, i18n locales, BYOK system, and security hardening.',
          canonical: 'https://www.shadowtalk-ai.com/changelog',
          keywords: ['changelog', 'release notes', 'product updates', 'version history'],
          ogType: 'website',
          twitterCard: 'summary',
          noIndex: false,
        }}
      />
      <Navigation />
      <div className="fixed inset-0 pointer-events-none">
        <FloatingOrbs className="absolute inset-0" />
        <div className="absolute inset-0 bg-grid opacity-[0.10]" />
      </div>

      <header className="border-b border-border/50 glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Changelog</h1>
            <p className="text-sm text-muted-foreground">What&apos;s new in ShadowTalk AI</p>
          </div>
        </div>
      </header>

      <section className="pt-12 pb-8 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.12]" />
        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <Badge variant="outline" className="mb-4 glass-subtle border-primary/20">
              <Rocket className="h-3 w-3 mr-1" /> Release Notes
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
              Every improvement, <span className="gradient-text">documented</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Workspace-first entry, persistent auth, App Builder, marketplace agents, and hardware-aware
              routing — plus admin-published updates from the CMS.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 glass-subtle rounded-xl">
            No changelog entries available.
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-border/40 to-transparent hidden md:block" />
            <div className="space-y-5">{entries.map((entry, index) => renderEntry(entry, index))}</div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <SpotlightCard>
          <div className="glass-subtle rounded-2xl p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2 tracking-tight">Try the latest</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Open the workspace for instant chat, or read full guides on the docs page.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button className="btn-glow" onClick={() => navigate("/chatbot")}>
                Open workspace
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate("/docs")}>
                Read documentation
              </Button>
            </div>
          </div>
          </SpotlightCard>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ChangelogPage;
