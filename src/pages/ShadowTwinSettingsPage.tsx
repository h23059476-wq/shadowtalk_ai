import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Upload, Users, Globe, Link as LinkIcon, Activity, Loader2, CheckCircle2, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/PageTransition';
import { SEOHead } from '@/components/SEOHead';
import { backend } from '@/integrations/local/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function ShadowTwinSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTraining, setIsTraining] = useState(false);
  const [twinReady, setTwinReady] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<{ name: string; content: string }[]>([]);
  const [conversationCount, setConversationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  // Generate the public Twin link in the correct /t/username format
  const username = user?.user_metadata?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'user';
  const publicLink = typeof window !== 'undefined'
    ? `${window.location.origin}/t/${username}`
    : '';

  // Load stats from Firestore
  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      try {
        const { data: convs } = await backend
          .from('conversations')
          .select('id')
          .eq('user_id', user.id);
        setConversationCount(convs?.length || 0);

        const { data: msgs } = await backend
          .from('messages')
          .select('id')
          .eq('user_id', user.id);
        setMessageCount(msgs?.length || 0);
      } catch {
        // Stats are best-effort
      }
    };
    void loadStats();
  }, [user]);

  // Check if twin is already trained (stored in user_settings)
  useEffect(() => {
    if (!user) return;
    const checkTwinStatus = async () => {
      try {
        const { data } = await backend
          .from('user_settings')
          .select('twin_trained, twin_knowledge')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.twin_trained) {
          setTwinReady(true);
          if (data.twin_knowledge) {
            try {
              setKnowledgeFiles(JSON.parse(data.twin_knowledge));
            } catch { /* invalid JSON */ }
          }
        }
      } catch { /* best-effort */ }
    };
    void checkTwinStatus();
  }, [user]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast({
      title: 'Link Copied',
      description: 'Your Shadow Twin public link has been copied to clipboard.',
    });
  };

  const handleTrain = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to train your Shadow Twin.', variant: 'destructive' });
      return;
    }

    setIsTraining(true);
    try {
      // 1. Gather recent conversation context from Firestore
      let conversationContext = '';
      try {
        const { data: recentMsgs } = await backend
          .from('messages')
          .select('content, role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (recentMsgs && recentMsgs.length > 0) {
          conversationContext = recentMsgs
            .map((m: any) => `${m.role}: ${m.content}`)
            .join('\n\n')
            .slice(0, 8000);
        }
      } catch { /* best-effort */ }

      // 2. Add knowledge file contents
      const knowledgeContext = knowledgeFiles
        .map((f) => `--- ${f.name} ---\n${f.content.slice(0, 4000)}`)
        .join('\n\n');

      // 3. Build the twin profile
      const twinProfile = {
        username,
        email: user.email,
        conversationStyle: conversationContext,
        knowledge: knowledgeContext,
        trainedAt: new Date().toISOString(),
      };

      // 4. Save to user_settings
      await backend
        .from('user_settings')
        .upsert({
          user_id: user.id,
          twin_trained: true,
          twin_knowledge: JSON.stringify(knowledgeFiles),
          twin_profile: JSON.stringify(twinProfile),
        });

      setTwinReady(true);
      toast({
        title: 'Training Complete',
        description: 'Your Shadow Twin is ready! Share your public link to let others chat with your Twin.',
      });
    } catch (err) {
      console.error('[Shadow Twin] Training failed:', err);
      toast({
        title: 'Training failed',
        description: 'Could not train your Twin. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: { name: string; content: string }[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${file.name} exceeds 5MB.`, variant: 'destructive' });
        continue;
      }
      try {
        const text = await file.text();
        newFiles.push({ name: file.name, content: text });
      } catch {
        toast({ title: 'Could not read file', description: `${file.name} is not a text file.`, variant: 'destructive' });
      }
    }

    if (newFiles.length > 0) {
      setKnowledgeFiles((prev) => [...prev, ...newFiles]);
      toast({ title: 'Files added', description: `${newFiles.length} file(s) added to your Twin's knowledge.` });
    }

    // Reset input
    if (e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
    setKnowledgeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: 'Shadow Twin — Your Digital Clone | ShadowTalk AI',
          description: 'Train your autonomous digital clone to represent you 24/7. Upload knowledge sources and share your public Twin link.',
          canonical: 'https://www.shadowtalk-ai.com/shadow-twin',
          keywords: ['shadow twin', 'digital clone', 'AI twin', 'autonomous agent'],
          ogType: 'website',
          twitterCard: 'summary',
          noIndex: false,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-5xl mx-auto py-12 px-6">

          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                Shadow Twin
              </h1>
              <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
                Train your autonomous digital clone to represent you. Share your public link with colleagues, clients, or friends so they can interact with your knowledge base 24/7.
              </p>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-200">Twin Status</p>
                <p className={`text-xs ${twinReady ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {twinReady ? 'Active & Ready' : 'Not Trained'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Left Column: Public Link & Analytics */}
            <div className="md:col-span-1 space-y-6">

              <div className="ios-glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-foreground">Public Link</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Share this link for anyone to talk to your Twin.
                </p>
                <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-border/10 overflow-hidden">
                  <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate" title={publicLink}>{publicLink}</span>
                </div>
                <Button
                  onClick={handleCopyLink}
                  disabled={!twinReady}
                  className="w-full mt-4 ios-glass-button text-blue-400 disabled:opacity-50"
                >
                  Copy Link
                </Button>
                {!twinReady && (
                  <p className="text-[11px] text-muted-foreground mt-2 text-center">
                    Train your Twin first to activate the public link.
                  </p>
                )}
              </div>

              <div className="ios-glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-foreground">Your Stats</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Conversations</span>
                    <span className="font-semibold text-foreground">{conversationCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Messages</span>
                    <span className="font-semibold text-foreground">{messageCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Knowledge Files</span>
                    <span className="font-semibold text-foreground">{knowledgeFiles.length}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Training & Knowledge */}
            <div className="md:col-span-2 space-y-6">

              <div className="ios-glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Twin Training</h2>
                      <p className="text-sm text-muted-foreground">Analyze your conversations and knowledge to build your clone</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleTrain}
                    disabled={isTraining || !user}
                    className="ios-glass-button-accent text-white px-6"
                  >
                    {isTraining ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Training...
                      </>
                    ) : twinReady ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Re-train
                      </>
                    ) : (
                      'Train Now'
                    )}
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-black/20 rounded-xl border border-border/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Chat History</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${messageCount > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-muted-foreground bg-muted/10'}`}>
                      {messageCount > 0 ? `${messageCount} messages` : 'No messages yet'}
                    </span>
                  </div>
                  <div className="p-4 bg-black/20 rounded-xl border border-border/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Writing Style</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${twinReady ? 'text-emerald-400 bg-emerald-400/10' : 'text-muted-foreground bg-muted/10'}`}>
                      {twinReady ? 'Analyzed' : 'Not trained'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Knowledge Files */}
              <div className="ios-glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <Upload className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Knowledge Sources</h2>
                      <p className="text-sm text-muted-foreground">Upload documents to give your Twin specific knowledge</p>
                    </div>
                  </div>
                </div>

                {/* Uploaded files list */}
                {knowledgeFiles.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {knowledgeFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-border/5">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{Math.round(file.content.length / 1024)}KB</span>
                        <button
                          onClick={() => removeFile(idx)}
                          className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <label className="flex flex-col items-center justify-center py-8 text-center cursor-pointer border-2 border-dashed border-border/10 rounded-2xl hover:border-purple-500/30 transition-colors">
                  <div className="p-4 bg-blue-500/10 rounded-full mb-4">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Upload Knowledge Sources</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-2">
                    Upload text files, code, markdown, or your resume (max 5MB each)
                  </p>
                  <span className="text-xs text-purple-400 hover:text-purple-300">Select Files</span>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md,.js,.ts,.tsx,.jsx,.py,.json,.csv,.html,.css,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

          </div>
        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}
