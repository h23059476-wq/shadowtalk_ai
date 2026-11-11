import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Check, Code, Globe, Shield, Zap } from "lucide-react";

export const AgenticAIWorkspacePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead meta={PAGE_SEO.agenticAIWorkspace} />
      <Navigation />
      
      <section className="pt-28 pb-14 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-4 glass-subtle border-primary/30 text-primary">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Agentic AI Guide
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              What Is an <span className="gradient-text">Agentic AI Workspace</span>?
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              An agentic AI workspace combines chat, tools, and autonomous agents in one unified environment — letting AI actually execute tasks, not just answer questions.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-8 px-4 bg-muted/5">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Zap className="h-8 w-8 text-primary" />
                    <CardTitle>Traditional AI Chat</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>Answer questions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>Summarize text</span>
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      ✗ Cannot browse the web autonomously
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      ✗ Cannot execute code
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      ✗ Cannot run multi-step workflows
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="h-full border-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    <CardTitle>Agentic AI Workspace</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>Autonomous task execution</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>Browse & analyze web</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>Run code securely</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>Multi-step missions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>E2EE chat & deep research</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">Core Capabilities</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Optional E2EE Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Encrypted chat mode keeps prompts private. Standard chat sends prompts to AI providers via TLS.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tool Orchestration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Chain web search, deep research, code execution, file operations, security audit, and more from natural language.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optional On-Device AI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Opt in to on-device inference via WebLLM/WebGPU. Requires model download. Standard chat uses cloud AI providers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multi-Model Routing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Turbo Engine automatically routes between Groq (fast), OpenAI (reasons), and GLM (Chinese) based on task complexity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/5">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Experience Agentic AI?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Try ShadowTalk free — no login, no card, no limits to explore.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/chatbot">
                <Zap className="h-5 w-5" />
                Try ShadowTalk Free
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/docs">
                <BookOpen className="h-5 w-5" />
                Read Documentation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AgenticAIWorkspacePage;