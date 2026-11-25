import { Link, useParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { SITE_URL, getSpeakableSchema } from "@/lib/seo";
import {
  BLOG_POSTS,
  getBlogPost,
  getBlogPostUrl,
  getBlogPostingSchema,
  getBlogBreadcrumbSchema,
} from "@/lib/blog";

/**
 * /blog/:slug — renders one Markdown post from content/blog/ with dynamic
 * <title>, meta description, canonical and BlogPosting JSON-LD. react-markdown
 * + remark-gfm match the markdown the Gemini pipeline emits (tables, lists,
 * fenced code). Content ships inside the JS bundle via import.meta.glob —
 * no runtime fetch, and prerender.cjs covers new posts automatically.
 */
const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <main className="container mx-auto px-4 pt-28 pb-20 max-w-2xl text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-3">Post not found</h1>
          <p className="text-sm text-muted-foreground mb-8">
            This article doesn't exist yet — it may still be in the content pipeline.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back to the blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const meta = {
    title: post.title,
    description: post.description,
    canonical: getBlogPostUrl(post.slug),
    ogType: "article" as const,
  };

  const structuredData = [getBlogPostingSchema(post), getBlogBreadcrumbSchema(), getSpeakableSchema(["#blog-definition"])];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead meta={meta} structuredData={structuredData} />
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 max-w-3xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-foreground/80 truncate max-w-[240px]">{post.title}</span>
        </nav>

        <article>
          {/* Extractive standfirst — quotable answer block for answer engines */}
          <p id="blog-definition" className="text-base sm:text-lg leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-4 mb-6">
            {post.description}
          </p>

          <div className="mb-10 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {post.date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                <time dateTime={post.date}>{post.date}</time>
              </span>
            )}
            {post.audience && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-2.5 py-1">
                For: {post.audience}
              </span>
            )}
          </div>

          <div className="prose prose-neutral dark:prose-invert prose-sm sm:prose-base max-w-none prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:text-sm prose-blockquote:border-primary/40">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>
        </article>

        {/* Next post */}
        {(() => {
          const idx = BLOG_POSTS.findIndex((p) => p.slug === post.slug);
          const next = BLOG_POSTS[(idx + 1) % BLOG_POSTS.length];
          return next && next.slug !== post.slug ? (
            <div className="mt-14 rounded-2xl border border-border/50 bg-card/40 p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Keep reading</p>
              <Link
                to={`/blog/${next.slug}`}
                className="group inline-flex items-baseline gap-2 text-lg font-semibold tracking-tight hover:text-primary transition-colors"
              >
                {next.title}
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          ) : null;
        })()}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
