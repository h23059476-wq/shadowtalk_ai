import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Code,
  Shield,
  Zap,
  ArrowRight,
  ArrowLeft,
  Search,
  Share2,
  Check,
  User,
  Tag,
  Layers,
  Cpu,
  Target,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { PRODUCTION_POSTS, type BlogPost } from "@/content/blogPosts";

const CATEGORIES = ["All", "Architecture", "Agentic AI", "Tutorials", "Product Updates"];

export const BlogPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    return PRODUCTION_POSTS.filter((post) => {
      const matchesCat = activeCategory === "All" || post.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  const featuredPost = filteredPosts[0] || PRODUCTION_POSTS[0];
  const gridPosts = filteredPosts.length > 1 ? filteredPosts.slice(1) : filteredPosts;

  const handleShare = (post: BlogPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/blog#${post.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(post.slug);
    toast.success("Article link copied to clipboard!");
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <SEOHead meta={PAGE_SEO.blog} />
      <Navigation />

      {/* Floating Back to Chatbot */}
      <div className="fixed bottom-6 left-6 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/chatbot")}
          className="gap-2 glass-strong border-border/50 hover:border-primary/40 shadow-lg backdrop-blur-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chatbot
        </Button>
      </div>

      {/* Hero Section */}
      <section className="pt-28 pb-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dense opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 glass-subtle border-primary/30 text-primary py-1 px-3">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Engineering, Architecture & Systems Blog
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              ShadowTalk <span className="gradient-text">Engineering Blog</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Technical deep dives on multi-model routing, agentic state machines, edge runtime benchmarks, 
              and the philosophy of autonomous software design.
            </p>

            {/* Search Input */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles, architectures, benchmarks, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-5 text-sm bg-background/80 border-border/60 rounded-xl shadow-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-mono"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="py-4 px-4 border-y border-border/40 bg-muted/5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-start sm:justify-center flex-wrap">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "glass-subtle text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Hero Article */}
      {featuredPost && activeCategory === "All" && !searchQuery && (
        <section className="py-8 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card
                onClick={() => setSelectedPost(featuredPost)}
                className="glass-subtle border-primary/30 hover:border-primary/60 cursor-pointer transition-all duration-300 overflow-hidden group shadow-elevated bg-gradient-to-br from-primary/10 via-background to-secondary/5"
              >
                <div className="grid lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground text-xs font-mono">
                        Featured Article
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono text-muted-foreground border-border/50">
                        {featuredPost.category}
                      </Badge>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground group-hover:text-primary transition-colors tracking-tight leading-tight">
                      {featuredPost.title}
                    </h2>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {featuredPost.excerpt}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground">{featuredPost.author.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{featuredPost.publishedAt}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{featuredPost.readTime}</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-between h-full gap-4">
                    <div className="flex flex-wrap gap-1.5">
                      {featuredPost.tags.map((t) => (
                        <span key={t} className="text-[10px] px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-md">
                      Read Complete Paper
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      {/* Grid of Articles */}
      <section className="py-8 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              {activeCategory === "All" && !searchQuery ? "Recent Publications" : `Articles (${filteredPosts.length})`}
            </h3>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="text-center py-16 glass-subtle rounded-2xl border border-border/50 p-8 max-w-md mx-auto">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h4 className="font-bold text-lg mb-1">No articles match your query</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Try searching for another topic or reset the category filters.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeCategory === "All" && !searchQuery ? gridPosts : filteredPosts).map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                >
                  <Card
                    onClick={() => setSelectedPost(post)}
                    className="glass-subtle border-border/50 hover:border-primary/40 cursor-pointer transition-all duration-300 h-full flex flex-col justify-between p-5 group hover:shadow-elevated"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-primary border-primary/20">
                          {post.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">{post.readTime}</span>
                      </div>

                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
                        {post.title}
                      </h4>

                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                        {post.excerpt}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-muted/40 text-muted-foreground font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/30">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-primary" />
                          <span className="truncate max-w-[130px]">{post.author.name}</span>
                        </div>
                        <button
                          onClick={(e) => handleShare(post, e)}
                          className="hover:text-primary transition-colors p-1"
                          title="Copy Link"
                        >
                          {copiedSlug === post.slug ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Article Reader Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden bg-popover border-border/60">
          {selectedPost && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <DialogHeader className="p-6 pb-4 border-b border-border/40">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono text-primary border-primary/30">
                    {selectedPost.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{selectedPost.readTime}</span>
                  <span className="text-xs text-muted-foreground font-mono">· {selectedPost.publishedAt}</span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-bold leading-snug">
                  {selectedPost.title}
                </DialogTitle>
                <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{selectedPost.author.name}</span>
                  <span>({selectedPost.author.role})</span>
                </div>
              </DialogHeader>

              <ScrollArea className="p-6 pt-4 flex-1">
                <div className="prose prose-invert prose-sm max-w-none space-y-4 text-foreground/90 leading-relaxed font-sans">
                  {selectedPost.content.split("\n\n").map((block, i) => {
                    const trimmed = block.trim();
                    if (trimmed.startsWith("### ")) {
                      return <h3 key={i} className="text-lg font-bold text-foreground mt-5 mb-2">{trimmed.replace("### ", "")}</h3>;
                    }
                    if (trimmed.startsWith("#### ")) {
                      return <h4 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{trimmed.replace("#### ", "")}</h4>;
                    }
                    if (trimmed.startsWith("- ")) {
                      return (
                        <ul key={i} className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-muted-foreground">
                          {trimmed.split("\n- ").map((item, j) => (
                            <li key={j}>{item.replace(/^- /, "")}</li>
                          ))}
                        </ul>
                      );
                    }
                    if (/^\d+\.\s/.test(trimmed)) {
                      return (
                        <ol key={i} className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-muted-foreground">
                          {trimmed.split(/\n\d+\.\s/).map((item, j) => (
                            <li key={j}>{item.replace(/^\d+\.\s/, "")}</li>
                          ))}
                        </ol>
                      );
                    }
                    return <p key={i} className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{trimmed}</p>;
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-border/40 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPost.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] font-mono">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleShare(selectedPost, e)}
                      className="text-xs gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share Article
                    </Button>
                    <Button asChild size="sm" className="bg-primary text-primary-foreground text-xs">
                      <Link to="/chatbot">Execute in Chatbot &rarr;</Link>
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default BlogPage;
