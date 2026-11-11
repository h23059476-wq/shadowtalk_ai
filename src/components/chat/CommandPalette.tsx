import { useState, useEffect, useCallback, useMemo } from "react";
import { backend } from "@/integrations/local/client";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Search, Image, FileText, Brain, Mic, AudioLines, Code, Shield, 
  Sparkles, Globe, Bot, Zap, Camera, Calendar, GamepadIcon,
  Eye, Folder, MessageSquare, Settings, Moon, Sun, LogOut,
  Users, Keyboard, ArrowRight, Star, Clock, Flame, Compass,
  BarChart3, Palette, Key, Activity, BookOpen, Database,
  GitBranch, Sliders, Lock, Target, Leaf, Navigation, Wand2,
  Rocket, Cpu, PenTool, LayoutDashboard, UserPlus, Mail,
  HardDrive, Layers, BrainCircuit, Cog, FileCode, MonitorSmartphone, Link2, Music, Crosshair
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: string, params?: any) => void;
}

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  category: string;
  action: () => void;
  keywords?: string[];
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export const CommandPalette = ({ open, onOpenChange, onAction }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { canAccess } = useFeatureGating();
  const [search, setSearch] = useState("");
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Load recent commands from backend, fallback to localStorage
  useEffect(() => {
    const loadRecent = async () => {
      const { data: { user } } = await backend.auth.getUser();
      if (user) {
        try {
          const { data } = await backend
            .from('user_settings')
            .select('setting_value')
            .eq('user_id', user.id)
            .eq('setting_key', 'recent_commands')
            .maybeSingle();
          if (data?.setting_value) {
            setRecentCommands((data.setting_value as string[]).slice(0, 5));
            return;
          }
        } catch { /* fallback below */ }
      }
      const recent = localStorage.getItem('shadowtalk_recent_commands');
      if (recent) {
        setRecentCommands(JSON.parse(recent).slice(0, 5));
      }
    };
    if (open) loadRecent();
  }, [open]);

  const trackCommand = useCallback(async (commandId: string) => {
    const recent = JSON.parse(localStorage.getItem('shadowtalk_recent_commands') || '[]');
    const updated = [commandId, ...recent.filter((id: string) => id !== commandId)].slice(0, 10);
    localStorage.setItem('shadowtalk_recent_commands', JSON.stringify(updated));

    // Sync to backend
    const { data: { user } } = await backend.auth.getUser();
    if (user) {
      backend.from('user_settings').upsert({
        user_id: user.id,
        setting_key: 'recent_commands',
        setting_value: updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,setting_key' }).then(() => {});
    }
  }, []);

  const executeAndClose = useCallback((commandId: string, action: () => void) => {
    trackCommand(commandId);
    action();
    onOpenChange(false);
    setSearch("");
  }, [trackCommand, onOpenChange]);

  const commands: CommandAction[] = useMemo(() => [
    // AI Tools - ChatGPT Beaters
    {
      id: "deep-research",
      label: "Deep Research",
      description: "Multi-source analysis with citations",
      icon: <Search className="h-4 w-4" />,
      shortcut: "⌘R",
      category: "AI Tools",
      action: () => onAction("deep-research"),
      keywords: ["research", "analyze", "perplexity", "search", "cite"],
      badge: "Beats ChatGPT",
      badgeVariant: "default" as const,
    },
    {
      id: "multi-model",
      label: "Multi-Model Consensus",
      description: "Query GPT + Gemini + Claude together",
      icon: <Brain className="h-4 w-4" />,
      shortcut: "⌘M",
      category: "AI Tools",
      action: () => onAction("multi-model"),
      keywords: ["consensus", "orchestrator", "multiple", "models"],
      badge: "Enterprise",
      badgeVariant: "secondary" as const,
    },
    {
      id: "agentic-runner",
      label: "Agentic Task Runner",
      description: "Autonomous multi-step task execution",
      icon: <Bot className="h-4 w-4" />,
      shortcut: "⌘⇧A",
      category: "AI Tools",
      action: () => onAction("agentic"),
      keywords: ["agent", "autonomous", "workflow", "task"],
      badge: "New",
      badgeVariant: "destructive" as const,
    },
    {
      id: "computer-mode",
      label: "Computer Mode",
      description: "Real npm/node shell in your browser (WebContainer)",
      icon: <MonitorSmartphone className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("computer"),
      keywords: ["computer", "shell", "terminal", "npm", "manus", "sandbox", "code run"],
      badge: "New",
      badgeVariant: "default" as const,
    },
    {
      id: "creative-synthesis",
      label: "Creative Synthesis",
      description: "Generate poetry, code, images simultaneously",
      icon: <Sparkles className="h-4 w-4" />,
      shortcut: "⌘⇧C",
      category: "AI Tools",
      action: () => onAction("creative"),
      keywords: ["creative", "poetry", "art", "synthesis", "generate"],
    },
    {
      id: "image-generator",
      label: "Generate Image",
      description: "AI image generation",
      icon: <Image className="h-4 w-4" />,
      shortcut: "⌘I",
      category: "AI Tools",
      action: () => onAction("image"),
      keywords: ["image", "picture", "art", "dalle", "midjourney"],
    },
    {
      id: "music-generator",
      label: "Music Studio",
      description: "Generate music and sound effects",
      icon: <Music className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("music"),
      keywords: ["music", "song", "beat", "audio", "sfx", "sound"],
      badge: "New",
      badgeVariant: "default" as const,
    },
    {
      id: "document-generator",
      label: "Generate Document",
      description: "Create articles, reports, emails",
      icon: <FileText className="h-4 w-4" />,
      shortcut: "⌘D",
      category: "AI Tools",
      action: () => onAction("document"),
      keywords: ["document", "article", "report", "email", "write"],
    },
    
    // Privacy & Security
    {
      id: "stealth-vault",
      label: "Stealth Vault",
      description: "Zero-knowledge encrypted storage",
      icon: <Shield className="h-4 w-4" />,
      shortcut: "⌘⇧V",
      category: "Privacy",
      action: () => onAction("vault"),
      keywords: ["vault", "encrypt", "private", "secret", "secure"],
      badge: "Privacy",
      badgeVariant: "outline" as const,
    },
    {
      id: "offline-mode",
      label: "Enable Offline AI",
      description: "100% local - no internet needed",
      icon: <Zap className="h-4 w-4" />,
      category: "Privacy",
      action: () => onAction("offline"),
      keywords: ["offline", "local", "sovereign", "private"],
      badge: "Beats Gemini",
      badgeVariant: "default" as const,
    },
    {
      id: "sovereign-models",
      label: "Local Model Sovereignty",
      description: "Manage on-device AI models",
      icon: <Shield className="h-4 w-4" />,
      shortcut: "⌘⇧S",
      category: "Privacy",
      action: () => onAction("sovereign"),
      keywords: ["local", "sovereign", "models", "device", "privacy"],
      badge: "Beats Gemini",
      badgeVariant: "default" as const,
    },
    {
      id: "security-audit",
      label: "Security Audit",
      description: "Scan code for vulnerabilities",
      icon: <Shield className="h-4 w-4" />,
      category: "Privacy",
      action: () => onAction("security"),
      keywords: ["security", "audit", "scan", "vulnerability"],
    },
    
    // Voice & Vision
    {
      id: "voice-chat",
      label: "ShadowTalk Live",
      description: "Real-time voice conversation",
      icon: <Mic className="h-4 w-4" />,
      shortcut: "⇧L",
      category: "Voice & Vision",
      action: () => onAction("voice"),
      keywords: ["voice", "talk", "speak", "conversation", "live"],
    },
    {
      id: "camera-capture",
      label: "Camera Analysis",
      description: "Capture and analyze with AI",
      icon: <Camera className="h-4 w-4" />,
      category: "Voice & Vision",
      action: () => onAction("camera"),
      keywords: ["camera", "capture", "photo", "vision"],
    },
    {
      id: "vision-agent",
      label: "Vision Agent",
      description: "Persistent screen awareness",
      icon: <Eye className="h-4 w-4" />,
      shortcut: "⌘⇧X",
      category: "Voice & Vision",
      action: () => onAction("vision-agent"),
      keywords: ["vision", "screen", "watch", "monitor", "agent"],
    },
    
    // Productivity
    {
      id: "daily-planner",
      label: "Daily Planner",
      description: "AI-powered schedule optimization",
      icon: <Calendar className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("planner"),
      keywords: ["planner", "schedule", "calendar", "tasks"],
    },
    {
      id: "data-organizer",
      label: "Organize Data",
      description: "Convert text to structured tables",
      icon: <Folder className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("organize"),
      keywords: ["organize", "data", "table", "structure", "json"],
    },
    {
      id: "code-workspace",
      label: "Code IDE",
      description: "Monaco editor, preview, and project templates",
      icon: <Code className="h-4 w-4" />,
      shortcut: "⌘⇧E",
      category: "Productivity",
      action: () => onAction("code"),
      keywords: ["code", "ide", "execute", "run", "programming"],
      badge: "Beats ChatGPT",
      badgeVariant: "default" as const,
    },
    
    // Integrations
    {
      id: "google-integration",
      label: "Google Integration",
      description: "Connect Gmail, Drive, Docs, Calendar",
      icon: <Globe className="h-4 w-4" />,
      shortcut: "⌘⇧G",
      category: "Integrations",
      action: () => onAction("google"),
      keywords: ["google", "gmail", "drive", "docs", "calendar", "integration"],
      badge: "Match Gemini",
      badgeVariant: "secondary" as const,
    },
    {
      id: "shadowspectre",
      label: "ShadowSpectre",
      description: "Uncensored cybersecurity model — pentest, SOC, IR, intel",
      icon: <Crosshair className="h-4 w-4 text-red-400" />,
      category: "Integrations",
      action: () => onAction("shadowspectre"),
      keywords: ["shadowspectre", "cyber", "pentest", "hack", "soc", "cve", "exploit", "security"],
      badge: "Elite",
      badgeVariant: "destructive" as const,
    },
    
    // Collaboration
    {
      id: "collab-rooms",
      label: "Collaboration Rooms",
      description: "Real-time multiplayer AI chat",
      icon: <Users className="h-4 w-4" />,
      category: "Collaboration",
      action: () => navigate("/rooms"),
      keywords: ["rooms", "collaborate", "team", "multiplayer", "share"],
      badge: "Unique",
      badgeVariant: "secondary" as const,
    },
    
    // Navigation
    {
      id: "new-chat",
      label: "New Chat",
      description: "Start a fresh conversation",
      icon: <MessageSquare className="h-4 w-4" />,
      shortcut: "⌘N",
      category: "Navigation",
      action: () => onAction("new-chat"),
      keywords: ["new", "chat", "conversation", "fresh", "start"],
    },
    {
      id: "settings",
      label: "Settings",
      description: "Chat & AI settings (like ChatGPT / Claude)",
      icon: <Settings className="h-4 w-4" />,
      shortcut: "⌘,",
      category: "Navigation",
      action: () => navigate("/settings"),
      keywords: ["settings", "preferences", "customize", "config"],
    },
    {
      id: "pricing",
      label: "Free Access",
      description: "ShadowTalk is free — how it works",
      icon: <Star className="h-4 w-4" />,
      category: "Navigation",
      action: () => navigate("/pricing"),
      keywords: ["pricing", "free", "byok", "plan"],
    },
    {
      id: "sign-out",
      label: "Sign Out",
      description: "Log out of your account",
      icon: <LogOut className="h-4 w-4" />,
      category: "Account",
      action: () => signOut(),
      keywords: ["logout", "signout", "exit"],
    },
    
    // Fun
    {
      id: "wordle",
      label: "Play Wordle",
      description: "Quick word game break",
      icon: <GamepadIcon className="h-4 w-4" />,
      category: "Fun",
      action: () => onAction("wordle"),
      keywords: ["wordle", "game", "play", "fun"],
    },
    
    // === MISSING FEATURES ADDED BELOW ===
    
    // Shadow Browser
    {
      id: "shadow-browser",
      label: "Shadow Browser",
      description: "Built-in AI-powered web browser",
      icon: <Compass className="h-4 w-4" />,
      shortcut: "⌘⇧B",
      category: "AI Tools",
      action: () => onAction("browser"),
      keywords: ["browser", "browse", "web", "scrape", "navigate"],
      badge: "Unique",
      badgeVariant: "secondary" as const,
    },
    
    // Script Automation
    {
      id: "script-automation",
      label: "Script Automation",
      description: "Create trigger-based automation scripts",
      icon: <FileCode className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("script-automation"),
      keywords: ["script", "automation", "automate", "trigger", "cron"],
    },
    
    // Agent Workflows
    {
      id: "agent-workflows",
      label: "AI Agent Workflows",
      description: "Build multi-step AI workflow pipelines",
      icon: <Layers className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("agent-workflows"),
      keywords: ["workflow", "pipeline", "agent", "orchestrate"],
    },
    
    // Model Fine-Tuning
    {
      id: "model-fine-tuning",
      label: "Model Fine-Tuning",
      description: "Train custom AI models on your data",
      icon: <BrainCircuit className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("fine-tuning"),
      keywords: ["fine-tune", "train", "custom", "model"],
      badge: "Elite",
      badgeVariant: "secondary" as const,
    },
    
    // White-Label Branding
    {
      id: "white-label",
      label: "White-Label Branding",
      description: "Customize logos, colors, and themes",
      icon: <Palette className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("white-label"),
      keywords: ["brand", "white-label", "logo", "theme", "customize"],
      badge: "Elite",
      badgeVariant: "secondary" as const,
    },
    
    // Gemini / API Key Analytics
    {
      id: "gemini-analytics",
      label: "API Key Analytics",
      description: "Monitor API key usage and health",
      icon: <Key className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("gemini-analytics"),
      keywords: ["gemini", "api", "key", "analytics", "usage", "health"],
    },
    
    // Analytics Dashboard
    {
      id: "analytics-dashboard",
      label: "Analytics Dashboard",
      description: "View chat and usage statistics",
      icon: <BarChart3 className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("analytics"),
      keywords: ["analytics", "stats", "statistics", "usage", "metrics"],
    },
    
    // Eco / Planetary Actions
    {
      id: "eco-actions",
      label: "Planetary Actions",
      description: "Track eco impact and sustainability",
      icon: <Leaf className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("eco"),
      keywords: ["eco", "green", "carbon", "sustainability", "planet", "environment"],
    },
    {
      id: "screen-agent",
      label: "Screen Agent",
      description: "Share your screen for AI analysis and code extraction",
      icon: <MonitorSmartphone className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("screen-agent"),
      keywords: ["screen", "share", "capture", "analyze", "screen agent"],
    },
    
    // Shadow Execution (Strategy + Missions unified)
    {
      id: "shadow-execution",
      label: "Shadow Execution",
      description: "Autonomous missions, strategy reports, and research",
      icon: <Rocket className="h-4 w-4" />,
      category: "AI Tools",
      action: () => navigate("/execute"),
      keywords: ["strategy", "mission", "see", "execution", "swot", "autonomous"],
      badge: "Pro",
      badgeVariant: "default" as const,
    },
    
    {
      id: "shadow-cowork",
      label: "Shadow Cowork",
      description: "AI pair-programming workspace in chat",
      icon: <Code className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("shadow-cowork"),
      keywords: ["cowork", "pair", "programming", "monaco", "ide"],
    },
    {
      id: "uncensored-arena",
      label: "Uncensored Arena",
      description: "Advanced security research mode (authorized use)",
      icon: <Shield className="h-4 w-4" />,
      category: "Security",
      action: () => onAction("uncensored-arena"),
      keywords: ["uncensored", "arena", "red team", "security research"],
    },

    // Knowledge Vault
    {
      id: "knowledge-vault",
      label: "Knowledge Vault",
      description: "Persistent knowledge base for AI",
      icon: <BookOpen className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("knowledge-vault"),
      keywords: ["knowledge", "vault", "memory", "facts", "database"],
    },
    
    // Memory Panel
    {
      id: "memory-panel",
      label: "Memory & Context",
      description: "Manage AI memory and business context",
      icon: <Database className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("memory"),
      keywords: ["memory", "context", "remember", "business", "preferences"],
    },
    
    // Custom Instructions
    {
      id: "custom-instructions",
      label: "Custom Instructions",
      description: "Set persistent AI behavior rules",
      icon: <Sliders className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("custom-instructions"),
      keywords: ["custom", "instructions", "rules", "system", "prompt"],
    },
    
    // Conversation Branching
    {
      id: "conversation-branching",
      label: "Conversation Branching",
      description: "Fork conversations into branches",
      icon: <GitBranch className="h-4 w-4" />,
      category: "Productivity",
      action: () => onAction("branching"),
      keywords: ["branch", "fork", "split", "conversation", "tree"],
    },
    
    // Bunker Mode (Sovereign AI)
    {
      id: "bunker-mode",
      label: "Bunker Mode",
      description: "100% offline sovereign AI mode",
      icon: <HardDrive className="h-4 w-4" />,
      category: "Privacy",
      action: () => onAction("bunker"),
      keywords: ["bunker", "offline", "sovereign", "local", "private", "air-gap"],
      badge: "Elite",
      badgeVariant: "secondary" as const,
    },
    
    // Image Decoder
    {
      id: "image-decoder",
      label: "Image Decoder",
      description: "Analyze and extract data from images",
      icon: <Wand2 className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("image-decoder"),
      keywords: ["decode", "image", "analyze", "extract", "ocr"],
    },
    
    // Referral Program
    {
      id: "referral",
      label: "Referral Program",
      description: "Invite friends, earn rewards",
      icon: <UserPlus className="h-4 w-4" />,
      category: "Account",
      action: () => navigate("/referral"),
      keywords: ["referral", "invite", "earn", "rewards", "share"],
    },
    {
      id: "whatsapp-contacts",
      label: "WhatsApp Contacts",
      description: "Import contacts, draft messages, open WhatsApp",
      icon: <MessageSquare className="h-4 w-4" />,
      category: "Account",
      action: () => navigate("/whatsapp"),
      keywords: ["whatsapp", "contacts", "qr", "messaging", "wa"],
    },
    {
      id: "linked-accounts",
      label: "Linked Accounts",
      description: "WhatsApp QR, Google, GitHub, Slack",
      icon: <Link2 className="h-4 w-4" />,
      category: "Account",
      action: () => navigate("/profile?tab=linked"),
      keywords: ["integrations", "oauth", "connect", "whatsapp link"],
    },

    // Workspace
    {
      id: "workspace",
      label: "AI Workspace",
      description: "Persistent workspace with memory",
      icon: <LayoutDashboard className="h-4 w-4" />,
      category: "Productivity",
      action: () => navigate("/workspace"),
      keywords: ["workspace", "persistent", "memory", "context"],
    },
    {
      id: "code-ide",
      label: "Code IDE",
      description: "In-browser Monaco IDE with live preview",
      icon: <Code className="h-4 w-4" />,
      category: "Productivity",
      action: () => navigate("/ide"),
      keywords: ["ide", "code", "editor", "monaco", "programming"],
    },
    
    // Collaboration Rooms (already exists but adding Chat Rooms link)
    {
      id: "marketplace",
      label: "Marketplace",
      description: "Browse plugins and extensions",
      icon: <Cog className="h-4 w-4" />,
      category: "Integrations",
      action: () => navigate("/marketplace"),
      keywords: ["marketplace", "plugins", "extensions", "apps"],
    },
    
    // Cognitive Loop
    {
      id: "cognitive-loop",
      label: "Cognitive Loop",
      description: "Multi-agent debate reasoning engine",
      icon: <Cpu className="h-4 w-4" />,
      category: "AI Tools",
      action: () => onAction("cognitive-loop"),
      keywords: ["cognitive", "loop", "debate", "multi-agent", "reasoning"],
      badge: "Advanced",
      badgeVariant: "default" as const,
    },
    
    // Deep Canvas (document editor)
    {
      id: "canvas-document",
      label: "Document Canvas",
      description: "Rich document editor with AI assist",
      icon: <PenTool className="h-4 w-4" />,
      shortcut: "⌘⇧D",
      category: "Productivity",
      action: () => onAction("canvas-document"),
      keywords: ["canvas", "document", "editor", "write"],
    },
    
    // Privacy Score
    {
      id: "privacy-score",
      label: "Privacy Score",
      description: "Check your digital privacy rating",
      icon: <Activity className="h-4 w-4" />,
      category: "Privacy",
      action: () => onAction("privacy-score"),
      keywords: ["privacy", "score", "rating", "digital", "footprint"],
    },
  ], [onAction, navigate, signOut]);

  const recentCommandsList = useMemo(() => {
    return commands.filter(cmd => recentCommands.includes(cmd.id)).slice(0, 3);
  }, [commands, recentCommands]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {};
    commands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [commands]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          No results found. Try different keywords.
        </CommandEmpty>
        
        {/* Recent Commands */}
        {recentCommandsList.length > 0 && !search && (
          <>
            <CommandGroup heading="Recent">
              {recentCommandsList.map(cmd => (
                <CommandItem
                  key={`recent-${cmd.id}`}
                  onSelect={() => executeAndClose(cmd.id, cmd.action)}
                  className="flex items-center gap-3"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span>{cmd.label}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        
        {/* Grouped Commands */}
        {Object.entries(groupedCommands).map(([category, cmds]) => (
          <CommandGroup key={category} heading={category}>
            {cmds.map(cmd => (
              <CommandItem
                key={cmd.id}
                onSelect={() => executeAndClose(cmd.id, cmd.action)}
                className="flex items-center gap-3"
                keywords={cmd.keywords}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  {cmd.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cmd.label}</span>
                    {cmd.badge && (
                      <Badge variant={cmd.badgeVariant} className="text-[10px] px-1.5 py-0">
                        {cmd.badge}
                      </Badge>
                    )}
                  </div>
                  {cmd.description && (
                    <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                  )}
                </div>
                {cmd.shortcut && (
                  <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    {cmd.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        
        {/* Keyboard Shortcuts Help */}
        <CommandSeparator />
        <CommandGroup heading="Tips">
          <CommandItem disabled className="opacity-60">
            <Keyboard className="h-4 w-4 mr-2" />
            <span className="text-xs">Press <kbd className="mx-1 px-1 rounded bg-muted">⌘K</kbd> anytime to open this menu</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
