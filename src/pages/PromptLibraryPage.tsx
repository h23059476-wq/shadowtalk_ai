/**
 * PromptLibraryPage — the ShadowTalk prompt library.
 *
 * Route: /prompt-library
 *
 * 108 curated prompt packs (11,232 verified prompts) across 12 categories.
 * Pack metadata ships with the manifest; pack bodies load lazily when a pack
 * is opened. Every prompt can be copied or sent straight into the chatbot
 * via a localStorage prefill handoff picked up by ChatbotPage.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  BookMarked,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  GraduationCap,
  Handshake,
  LibraryBig,
  Megaphone,
  MessageSquare,
  Palette,
  PenLine,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stagePromptPrefill } from "@/lib/promptPrefill";
import {
  PROMPT_LIBRARY_CATEGORIES,
  PROMPT_LIBRARY_PACKS,
  PROMPT_LIBRARY_TOTALS,
  loadPromptPack,
  type PromptLibraryCategory,
  type PromptLibraryPackMeta,
  type PromptPack,
} from "@/data/prompt-library";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pen: PenLine,
  megaphone: Megaphone,
  briefcase: Briefcase,
  code: Code2,
  graduation: GraduationCap,
  palette: Palette,
  share: Share2,
  clock: Clock,
  handshake: Handshake,
  chart: BarChart3,
  sprout: Sprout,
  sparkles: Sparkles,
};

function categoryIcon(slug: string) {
  const cat = PROMPT_LIBRARY_CATEGORIES.find((c) => c.slug === slug);
  return CATEGORY_ICONS[cat?.icon ?? "sparkles"] ?? Sparkles;
}

/** Copy prompt text into the chat input after navigating to /chatbot. */
function usePromptPrefill() {
  const navigate = useNavigate();
  return useCallback(
    (text: string) => {
      if (text) stagePromptPrefill(text);
      navigate("/chatbot");
    },
    [navigate],
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Prompt copied to clipboard");
  } catch {
    toast.error("Could not access the clipboard");
  }
}

interface StatChipProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}

function StatChip({ icon: Icon, value, label }: StatChipProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function PackCard({
  pack,
  category,
  onOpen,
}: {
  pack: PromptLibraryPackMeta;
  category: PromptLibraryCategory;
  onOpen: (pack: PromptLibraryPackMeta) => void;
}) {
  const Icon = categoryIcon(category.slug);
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -2 }}
      onClick={() => onOpen(pack)}
      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {pack.promptCount} prompts
        </span>
      </div>
      <h3 className="mt-3.5 text-[15px] font-semibold leading-snug text-foreground">
        {pack.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
        {pack.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {pack.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-muted-foreground">
        <span className="truncate">{category.name}</span>
        <span className="flex items-center gap-0.5 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Open pack <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.button>
  );
}

function PackDetail({
  meta,
  onClose,
  onPrefill,
}: {
  meta: PromptLibraryPackMeta;
  onClose: () => void;
  onPrefill: (text: string) => void;
}) {
  const [pack, setPack] = useState<PromptPack | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(24);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setPack(null);
    setError(false);
    setVisible(24);
    loadPromptPack(meta.slug)
      .then((p) => {
        if (alive) {
          if (p) setPack(p);
          else setError(true);
        }
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [meta.slug]);

  const filtered = useMemo(() => {
    if (!pack) return [];
    const q = query.trim().toLowerCase();
    if (!q) return pack.prompts;
    return pack.prompts.filter((p) => p.text.toLowerCase().includes(q));
  }, [pack, query]);

  const handleCopy = async (id: string, text: string) => {
    await copyText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
        className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:h-[85vh] sm:rounded-2xl"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-foreground">{meta.title}</h2>
            <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
              {meta.description}
            </p>
            <p className="mt-1.5 text-xs font-medium text-primary">
              {meta.promptCount} verified prompts
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close pack"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* in-pack search */}
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(24);
              }}
              placeholder="Search within this pack..."
              className="pl-9"
              aria-label="Search within pack"
            />
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 custom-scrollbar">
          {error && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              This pack could not be loaded. Please try again.
            </p>
          )}
          {!error && !pack && (
            <div className="space-y-3 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}
          {pack && filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No prompts match “{query}”.
            </p>
          )}
          {pack && (
            <ul className="divide-y divide-border">
              {filtered.slice(0, visible).map((p, i) => (
                <li key={p.id} className="group flex items-start gap-3 py-3">
                  <span className="mt-1 w-7 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-foreground">
                    {p.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy prompt"
                      className="h-8 w-8"
                      onClick={() => handleCopy(p.id, p.text)}
                    >
                      {copiedId === p.id ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 px-2.5 text-xs"
                      onClick={() => onPrefill(p.text)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Use in Chat
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pack && filtered.length > visible && (
            <div className="py-4 text-center">
              <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + 24)}>
                Show {Math.min(24, filtered.length - visible)} more
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PromptLibraryPage() {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openPack, setOpenPack] = useState<PromptLibraryPackMeta | null>(null);
  const prefill = usePromptPrefill();

  const visiblePacks = useMemo(() => {
    let packs = category
      ? PROMPT_LIBRARY_PACKS.filter((p) => p.categorySlug === category)
      : PROMPT_LIBRARY_PACKS;
    const q = query.trim().toLowerCase();
    if (q) {
      packs = packs.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return packs;
  }, [category, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: "Prompt Library",
          description:
            "108 curated prompt packs with 11,232 tested prompts for writing, coding, marketing, study, images and more — ready to use in ShadowTalk chat.",
          canonical: "/prompt-library",
        }}
      />

      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => window.history.length > 1 && window.history.back()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold text-primary-foreground shadow-sm"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            >
              S
            </span>
            <span className="text-sm font-semibold tracking-tight">ShadowTalk Prompt Library</span>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => prefill("")}>
            <MessageSquare className="h-3.5 w-3.5" /> Open Chatbot
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        {/* hero */}
        <section className="pb-8 pt-12 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Every prompt machine-verified: unique, clean, grammar-checked
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Prompt packs that are{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            >
              ready to run
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Curated packs for writing, coding, marketing, study, images and more.
            Open one, copy a prompt, or send it straight into the chatbot — no
            placeholders, no filler, every line tested.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <StatChip icon={LibraryBig} value={String(PROMPT_LIBRARY_TOTALS.packs)} label="Prompt packs" />
            <StatChip
              icon={Sparkles}
              value={PROMPT_LIBRARY_TOTALS.prompts.toLocaleString()}
              label="Verified prompts"
            />
            <StatChip icon={BookMarked} value={String(PROMPT_LIBRARY_TOTALS.categories)} label="Categories" />
          </div>
        </section>

        {/* controls */}
        <section className="sticky top-14 z-30 -mx-4 border-y border-border bg-background/90 px-4 py-3 backdrop-blur">
          <div className="relative mx-auto max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search packs by name, topic, or tag..."
              className="pl-9"
              aria-label="Search prompt packs"
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                category === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              All ({PROMPT_LIBRARY_TOTALS.packs})
            </button>
            {PROMPT_LIBRARY_CATEGORIES.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCategory(category === c.slug ? null : c.slug)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  category === c.slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {c.name} ({c.packs.length})
              </button>
            ))}
          </div>
        </section>

        {/* pack grid */}
        <section className="mt-6">
          {visiblePacks.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No packs match “{query}”. Try a different search.
            </p>
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visiblePacks.map((pack) => {
                  const cat = PROMPT_LIBRARY_CATEGORIES.find(
                    (c) => c.slug === pack.categorySlug,
                  )!;
                  return (
                    <PackCard key={pack.slug} pack={pack} category={cat} onOpen={setOpenPack} />
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {openPack && (
          <PackDetail
            key={openPack.slug}
            meta={openPack}
            onClose={() => setOpenPack(null)}
            onPrefill={(text) => {
              setOpenPack(null);
              prefill(text);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
