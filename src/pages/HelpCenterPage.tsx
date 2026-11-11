import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MessageSquare,
  Zap,
  Shield,
  CreditCard,
  Settings,
  Users,
  Code,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDocsPages } from "@/hooks/useCMSContent";
import { getHelpArticleRoute } from "@/lib/helpArticleRoutes";
import { FollowUsSection } from "@/components/FollowUsSection";

const CATEGORY_META: Record<
  string,
  { icon: typeof MessageSquare; title: string; description: string; href: string }
> = {
  "getting-started": {
    icon: MessageSquare,
    title: "Getting Started",
    description: "Learn the basics of ShadowTalk AI",
    href: "/docs",
  },
  features: {
    icon: Zap,
    title: "Features & Capabilities",
    description: "Explore all AI features and modes",
    href: "/docs",
  },
  security: {
    icon: Shield,
    title: "Security & Privacy",
    description: "Data protection and security measures",
    href: "/privacy",
  },
  billing: {
    icon: CreditCard,
    title: "Billing",
    description: "Everything is free — BYOK explained",
    href: "/pricing",
  },
  account: {
    icon: Settings,
    title: "Account Settings",
    description: "Manage your account preferences",
    href: "/profile",
  },
  collaboration: {
    icon: Users,
    title: "Team & Collaboration",
    description: "Workspaces and team features",
    href: "/rooms",
  },
  api: {
    icon: Code,
    title: "API & Integrations",
    description: "Developer documentation and APIs",
    href: "/api",
  },
  troubleshooting: {
    icon: HelpCircle,
    title: "Troubleshooting",
    description: "Common issues and solutions",
    href: "/faq",
  },
  general: {
    icon: BookOpen,
    title: "Documentation",
    description: "Guides and reference material",
    href: "/docs",
  },
};

const HelpCenterPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { pages, isLoading } = useDocsPages();

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const page of pages) {
      const key = (page.category || "general").toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([key, articles]) => {
      const meta = CATEGORY_META[key] ?? CATEGORY_META.general;
      return { key, articles, ...meta };
    });
  }, [pages]);

  const popularArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? pages.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.content && String(p.content).toLowerCase().includes(q))
        )
      : pages;
    return filtered.slice(0, 8).map((p) => ({
      title: p.title,
      category: p.category || "general",
      slug: p.slug,
    }));
  }, [pages, searchQuery]);

  const articleHref = (article: { title: string; slug: string }) =>
    article.slug ? `/docs/${article.slug}` : getHelpArticleRoute(article.title);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-24 pb-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            <BookOpen className="h-3 w-3 mr-1" />
            Help Center
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How can we <span className="gradient-text">help you</span>?
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Search published docs or browse categories — counts come from the CMS.
          </p>

          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for articles, tutorials, and guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg"
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-muted-foreground glass-subtle rounded-xl p-6">
              No published docs yet. Browse the <Link to="/docs" className="text-primary underline">docs</Link> or{" "}
              <Link to="/faq" className="text-primary underline">FAQ</Link>.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link key={category.key} to={category.href}>
                  <Card className="h-full hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                        <category.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-bold mb-2">{category.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                      <Badge variant="outline">
                        {category.articles} article{category.articles === 1 ? "" : "s"}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8">
            {searchQuery.trim() ? "Search results" : "Published articles"}
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : popularArticles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching articles.</p>
          ) : (
            <div className="space-y-4">
              {popularArticles.map((article) => (
                <Link key={article.slug || article.title} to={articleHref(article)}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{article.title}</h3>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {article.category}
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-0">
              <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
              <p className="text-muted-foreground mb-6">
                Our support team is here to assist you with any questions or issues.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Contact Support
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mt-8 pt-8 border-t border-border/50">
                <FollowUsSection description="Product updates and founder notes on Instagram and LinkedIn." />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HelpCenterPage;
