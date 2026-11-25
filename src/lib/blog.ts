/**
 * Blog content registry — reads every Markdown post from `content/blog/`.
 *
 * The autonomous marketing pipeline (marketing-agent/n8n-marketing-workflow.json)
 * commits one file per post to `content/blog/<slug>.md` with YAML frontmatter:
 *
 *   ---
 *   slug: my-post-slug          # must match the filename
 *   title: ...                  # < 60 chars, used for <title> + H1
 *   description: ...            # < 155 chars, used for meta description
 *   date: 2026-11-25
 *   keyword: ...                # the Content_Queue keyword that produced this post
 *   audience: ...               # target audience line from Content_Queue
 *   ---
 *   <markdown body>
 *
 * Vite inlines the raw text at build time (import.meta.glob), so posts ship in
 * the bundle — no runtime fetch, no server needed. The sitemap generator and
 * prerender step read the same directory, so a new commit is fully indexed on
 * the next deploy.
 */
import { getBreadcrumbSchema } from "@/lib/seo";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  keyword?: string;
  audience?: string;
}

export interface BlogPost extends BlogPostMeta {
  /** Raw markdown body, frontmatter stripped */
  body: string;
}

/** Minimal, dependency-free YAML frontmatter reader for flat `key: value` files. */
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const normalized = raw.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---")) return { data: {}, body: normalized };
  const end = normalized.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: normalized };
  const head = normalized.slice(3, end).trim();
  const body = normalized.slice(end + 4).replace(/^\s*\n/, "");
  const data: Record<string, string> = {};
  for (const line of head.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body };
}

const modules = import.meta.glob("/content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function loadPosts(): BlogPost[] {
  const posts: BlogPost[] = [];
  for (const [path, raw] of Object.entries(modules)) {
    const fileSlug = path.split("/").pop()!.replace(/\.md$/, "");
    const { data, body } = parseFrontmatter(raw);
    const slug = data.slug || fileSlug;
    posts.push({
      slug,
      title: data.title || fileSlug.replace(/-/g, " "),
      description: data.description || "",
      date: data.date || "",
      keyword: data.keyword || undefined,
      audience: data.audience || undefined,
      body,
    });
  }
  return posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export const BLOG_POSTS: BlogPost[] = loadPosts();

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getBlogPostUrl(slug: string): string {
  return `https://www.shadowtalk-ai.com/blog/${slug}`;
}

/** BlogPosting JSON-LD for a single post (answer-engine citability). */
export function getBlogPostingSchema(post: BlogPost): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date || undefined,
    dateModified: post.date || undefined,
    url: getBlogPostUrl(post.slug),
    mainEntityOfPage: getBlogPostUrl(post.slug),
    author: { "@type": "Person", name: "Zain Ahmed Fahad Patel", url: "https://www.shadowtalk-ai.com/founder" },
    publisher: { "@type": "Organization", name: "ShadowTalk AI", url: "https://www.shadowtalk-ai.com" },
    keywords: post.keyword || undefined,
  };
}

export function getBlogBreadcrumbSchema(): Record<string, unknown> {
  return getBreadcrumbSchema([
    { name: "Home", url: "https://www.shadowtalk-ai.com/" },
    { name: "Blog", url: "https://www.shadowtalk-ai.com/blog" },
  ]);
}
