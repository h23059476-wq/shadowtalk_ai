import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import VisualKnowledgeGraph from "@/components/chat/VisualKnowledgeGraph";
import { PrivacyBanner } from "@/components/transparency/PrivacyBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Database, BookOpen, Sparkles, FileText } from "lucide-react";
import {
  searchKnowledgeBase,
  getKBStats,
  seedDefaultKnowledge,
  type KBSearchResult,
} from "@/lib/local-knowledge-base";

const KnowledgeGraphPage = () => {
  const [kbQuery, setKbQuery] = useState("");
  const [kbResults, setKbResults] = useState<KBSearchResult[]>([]);
  const [kbStats, setKbStats] = useState<{ totalArticles: number; totalWords: number; categories: { name: string; count: number }[] } | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getKBStats().then(setKbStats);
  }, []);

  const handleKBSearch = async () => {
    if (!kbQuery.trim()) return;
    setSearching(true);
    const results = await searchKnowledgeBase(kbQuery);
    setKbResults(results);
    setSearching(false);
  };

  const handleSeedKB = async () => {
    await seedDefaultKnowledge();
    const stats = await getKBStats();
    setKbStats(stats);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <PrivacyBanner dataLocation="device" featureName="Knowledge Graph" />

        <Tabs defaultValue="graph" className="mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
            <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="graph">
            <div className="h-[calc(100vh-14rem)]">
              <VisualKnowledgeGraph />
            </div>
          </TabsContent>

          <TabsContent value="kb" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Local Knowledge Base
                  {kbStats && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {kbStats.totalArticles} articles · {kbStats.totalWords.toLocaleString()} words
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search local knowledge base..."
                    value={kbQuery}
                    onChange={(e) => setKbQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleKBSearch()}
                  />
                  <Button onClick={handleKBSearch} disabled={searching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {/* Categories */}
                {kbStats && kbStats.categories.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {kbStats.categories.map((c) => (
                      <Badge
                        key={c.name}
                        variant="secondary"
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          setKbQuery(c.name);
                          searchKnowledgeBase(c.name).then(setKbResults);
                        }}
                      >
                        {c.name} ({c.count})
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Results */}
                {kbResults.length > 0 && (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {kbResults.map((result) => (
                        <Card key={result.article.id} className="hover:border-primary/30 transition-colors">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-sm">{result.article.title}</h3>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {(result.score * 100).toFixed(0)}% match
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3">{result.snippet}</p>
                            <div className="flex gap-1 flex-wrap">
                              {result.article.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{result.article.category}</span>
                              <span>·</span>
                              <span>{result.article.wordCount} words</span>
                              <span>·</span>
                              <span>Matched: {result.matchedTerms.join(", ")}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {kbResults.length === 0 && kbQuery && !searching && (
                  <p className="text-sm text-center text-muted-foreground py-4">No results found</p>
                )}

                {kbStats && kbStats.totalArticles === 0 && (
                  <div className="text-center py-8 space-y-3">
                    <Database className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Knowledge base is empty</p>
                    <Button variant="outline" onClick={handleSeedKB}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Seed with Domain Knowledge
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="max-w-lg mx-auto">
              <Card className="glass border-border/50">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Database className="h-6 w-6 text-amber-500" />
                  <CardTitle className="text-xl capitalize">analytics paused</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Local-session analytics are unavailable while mode is being rebuilt.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default KnowledgeGraphPage;
