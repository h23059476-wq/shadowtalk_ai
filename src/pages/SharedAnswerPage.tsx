import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { backend } from "@/integrations/local/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Loader2, MessageSquare } from "lucide-react";

const API_URL = '' as const;

interface SharedAnswer {
  slug: string;
  title: string | null;
  prompt: string;
  answer: string;
  model: string | null;
  source: string;
  views: number;
  created_at: string;
}

const SharedAnswerPage = () => {
  const { slug = "" } = useParams();
  const [data, setData] = useState<SharedAnswer | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Final completion phase: the previous read went through a Postgres
      // RPC ("get_shared_answer") that the Firebase adapter always refuses,
      // so EVERY /s/:slug page rendered "no longer available".
      // shared_answers is publicly readable per the security rules; query it
      // directly by slug instead.
      const { data, error } = await backend
        .from("shared_answers")
        .select("*")
        .eq("slug", slug)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setState("missing");
        return;
      }
      const row = data as unknown as SharedAnswer;
      setData({
        slug: row.slug ?? slug,
        title: row.title ?? null,
        prompt: row.prompt ?? "",
        answer: row.answer ?? "",
        model: row.model ?? null,
        source: row.source ?? "chat",
        views: typeof row.views === "number" ? row.views : 0,
        created_at: row.created_at ?? new Date().toISOString(),
      });
      setState("ready");
      // NOTE: view counting is intentionally not implemented client-side —
      // the security rules correctly forbid anonymous visitors from updating
      // documents. `views` stays server-managed; the old remote view-increment
      // call never worked and has been removed rather than faked.
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const shareUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    [],
  );
  const ogImage = '';
  const title = data?.title || "Answer from ShadowTalk AI";
  const description = data?.prompt?.slice(0, 155) ?? "Free AI chatbot — no login required.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Helmet>
        <title>{`${title} · ShadowTalk AI`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://shadowtalk-ai.com/s/${slug}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://shadowtalk-ai.com/s/${slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-40 bg-background/70">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            ShadowTalk
          </Link>
          <Button asChild size="sm" className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white">
            <Link to="/chatbot?utm_source=shared_answer&utm_medium=viral">
              Try free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        {state === "loading" && (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading answer…
          </div>
        )}

        {state === "missing" && (
          <Card className="p-10 text-center space-y-4">
            <h1 className="text-2xl font-bold">This answer is no longer available</h1>
            <p className="text-muted-foreground">The link may have expired or been removed.</p>
            <Button asChild>
              <Link to="/chatbot">Try ShadowTalk instead</Link>
            </Button>
          </Card>
        )}

        {state === "ready" && data && (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Shared from ShadowTalk {data.source === "strategy" ? "Strategy Agent" : "AI Chat"}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">{title}</h1>
            </div>

            <Card className="p-5 bg-muted/30 border-l-4 border-l-violet-500/60">
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">Prompt</div>
              <p className="text-sm whitespace-pre-wrap">{data.prompt}</p>
            </Card>

            <Card className="p-6 md:p-8">
              <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:my-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.answer}</ReactMarkdown>
              </div>
            </Card>

            <Card className="p-6 md:p-8 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 border-violet-500/30 text-center space-y-4">
              <h2 className="text-2xl font-bold">Get your own answer in seconds</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                ShadowTalk is a free, intelligent multi-model AI assistant. Fast, powerful, and ready to build.
              </p>
              <Button asChild size="lg" className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white">
                <Link to="/chatbot?utm_source=shared_answer&utm_medium=viral">
                  Open ShadowTalk — free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Card>
          </motion.article>
        )}
      </main>
    </div>
  );
};

export default SharedAnswerPage;
