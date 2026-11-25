import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronRight, Newspaper } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO, SITE_URL, getWebPageSchema, getBreadcrumbSchema, getItemListSchema } from "@/lib/seo";
import { BLOG_POSTS, getBlogPostUrl } from "@/lib/blog";

/**
 * /blog — hub for the autonomous marketing pipeline. Every post is committed
 * to content/blog/*.md by the n8n agent (Gemini → GitHub → CI deploy), so this
 * index is always data-driven from the committed Markdown, never hand-edited.
 */
const BlogIndexPage = () => {
  const meta = PAGE_SEO["blog"];

  const structuredData = [
    getWebPageSchema({ title: meta.title, description: meta.description, url: meta.canonical }),
    getBreadcrumbSchema([
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Blog", url: `${SITE_URL}/blog` },
    ]),
    ...(BLOG_POSTS.length
      ? [
          getItemListSchema(
            BLOG_POSTS.map((p) => ({
              name: p.title,
              url: getBlogPostUrl(p.slug),
              description: p.description,
            })),
          ),
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead meta={meta} structuredData={structuredData} />
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 max-w-3xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-foreground/80">Blog</span>
        </nav>

        {/* H1 + extractive definition (GEO answer block) */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
          The ShadowTalk blog — BYOK, offline AI and agentic workflows, explained
        </h1>
        <p id="blog-definition" className="text-base sm:text-lg leading-relaxed text-muted-foreground mb-10">
          Practical, honest posts from the team building ShadowTalk AI — a free
          agentic workspace with encrypted chat, bring-your-own-key access to 16+
          providers and an optional on-device model that works offline. Every
          post answers one question a real buyer or builder would ask.
        </p>

        {BLOG_POSTS.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card/40 p-8 text-center">
            <Newspaper className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No posts yet. The marketing pipeline publishes here automatically —
              a keyword goes in the Content_Queue sheet, and the finished article
              lands on this page on the next deploy.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-6 hover:border-primary/40 hover:bg-card/70 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  <time dateTime={post.date}>{post.date}</time>
                  {post.keyword && (
                    <span className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary truncate max-w-[140px]">
                      {post.keyword}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold leading-snug tracking-tight group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {post.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Read post
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogIndexPage;
