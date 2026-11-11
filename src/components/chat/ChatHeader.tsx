import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Bot, ArrowLeft, Home, LogOut, Settings, Download, Lock, Crown, Star, Zap, Menu, 
  Search, Image, Play, Eye, Wand2, Compass, FileText, Mic, AudioLines, MoreVertical, Music,
  LayoutGrid, Sparkles, MessageCircle, Briefcase, Heart, Laugh, Lightbulb,
  Scale, Target, HelpCircle, Share2, Plus, Pin, Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { BunkerModeToggle } from "./BunkerModeToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
import type { AIProvider } from "@/lib/aiProviders";
import { motion } from "framer-motion";

type Personality = "friendly" | "sarcastic" | "professional" | "creative" | "meticulous" | "curious" | "diplomatic" | "witty" | "pragmatic" | "inquisitive" | "spicy";
type UserPlan = 'free' | 'pro' | 'premium' | 'lifetime' | 'elite' | 'enterprise';

const personalities: { value: Personality; label: string; icon: React.ReactNode }[] = [
  { value: "friendly", label: "Friendly", icon: <Heart className="h-3.5 w-3.5" /> },
  { value: "professional", label: "Professional", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { value: "creative", label: "Creative", icon: <Wand2 className="h-3.5 w-3.5" /> },
  { value: "sarcastic", label: "Sarcastic", icon: <Laugh className="h-3.5 w-3.5" /> },
  { value: "meticulous", label: "Meticulous", icon: <Search className="h-3.5 w-3.5" /> },
  { value: "curious", label: "Curious", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { value: "diplomatic", label: "Diplomatic", icon: <Scale className="h-3.5 w-3.5" /> },
  { value: "witty", label: "Witty", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { value: "pragmatic", label: "Pragmatic", icon: <Target className="h-3.5 w-3.5" /> },
  { value: "inquisitive", label: "Inquisitive", icon: <HelpCircle className="h-3.5 w-3.5" /> },
  { value: "spicy", label: "🌶️ Spicy", icon: <Zap className="h-3.5 w-3.5 text-orange-500" /> },
];

interface ChatHeaderProps {
  userPlan: UserPlan;
  personality: Personality;
  onPersonalityChange: (personality: Personality) => void;
  onToggleSidebar: () => void;
  onExport: () => void;
  onManageSubscription: () => void;
  onSignOut: () => void;
  onOpenAnalytics: () => void;
  onOpenScriptAutomation: () => void;
  onOpenStealthVault: () => void;
  onOpenAgentWorkflows: () => void;
  onOpenModelFineTuning: () => void;
  onOpenWhiteLabelBranding: () => void;
  onOpenGeminiAnalytics: () => void;
  onOpenCanvas: (type: "document" | "code") => void;
  onOpenDeepResearch: () => void;
  onOpenGoogleIntegration?: () => void;
  onOpenImageGenerator: () => void;
  onOpenMusicGenerator?: () => void;
  onOpenShadowTalkLive: () => void;
  onOpenAgenticRunner: () => void;
  onOpenVisualReasoning: () => void;
  onOpenCreativeSynthesis: () => void;
  onOpenOfflineTools?: () => void;
  onOpenBrowser: () => void;
  aiProvider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  hasKeyForProvider?: (provider: AIProvider) => boolean;
  maxChats: string;
  dailyChats: number;
  variant?: "full" | "minimal";
  toolsMenuOpen?: boolean;
  onToolsMenuOpenChange?: (open: boolean) => void;
}

type ToolsHubHandlers = {
  onOpenDeepResearch: () => void;
  onOpenGoogleIntegration?: () => void;
  onOpenImageGenerator?: () => void;
  onOpenMusicGenerator?: () => void;
  onOpenAgenticRunner: () => void;
  onOpenVisualReasoning: () => void;
  onOpenCreativeSynthesis: () => void;
  onOpenShadowTalkLive: () => void;
  onOpenBrowser: () => void;
  onOpenCanvas: (type: "document" | "code") => void;
  onClose?: () => void;
};

const runTool = (fn: () => void, onClose?: () => void) => () => {
  fn();
  onClose?.();
};

const ToolsHubMenuContent = ({
  onOpenDeepResearch,
  onOpenGoogleIntegration,
  onOpenImageGenerator,
  onOpenMusicGenerator,
  onOpenAgenticRunner,
  onOpenVisualReasoning,
  onOpenCreativeSynthesis,
  onOpenShadowTalkLive,
  onOpenBrowser,
  onOpenCanvas,
  onClose,
}: ToolsHubHandlers) => (
  <div className="p-2">
    <div className="px-3 py-3 mb-1">
      <h3 className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
        <Sparkles className="h-3 w-3" /> Tools
      </h3>
    </div>
    <div className="grid grid-cols-2 gap-2 mb-2">
      <button type="button" onClick={runTool(onOpenDeepResearch, onClose)} className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all text-left">
        <Search className="h-4 w-4 text-blue-400" />
        <span className="text-[12px] font-semibold">Deep Research</span>
      </button>
      <button type="button" onClick={runTool(() => onOpenGoogleIntegration?.(), onClose)} className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all text-left">
        <Mail className="h-4 w-4 text-red-400" />
        <span className="text-[12px] font-semibold">Google Workspace</span>
      </button>
      <button type="button" onClick={runTool(onOpenAgenticRunner, onClose)} className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all text-left">
        <Play className="h-4 w-4 text-green-400" />
        <span className="text-[12px] font-semibold">Agentic Runner</span>
      </button>
      {onOpenImageGenerator && (
        <button type="button" onClick={runTool(onOpenImageGenerator, onClose)} className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all text-left">
          <Image className="h-4 w-4 text-violet-400" />
          <span className="text-[12px] font-semibold">Image Studio</span>
        </button>
      )}
      {onOpenMusicGenerator && (
        <button type="button" onClick={runTool(onOpenMusicGenerator, onClose)} className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all text-left">
          <Music className="h-4 w-4 text-fuchsia-400" />
          <span className="text-[12px] font-semibold">Music Studio</span>
        </button>
      )}
    </div>
    <div className="space-y-1">
      {[
        { icon: Eye, label: "Visual Reasoning", color: "text-purple-400", fn: onOpenVisualReasoning },
        { icon: Wand2, label: "Creative Studio", color: "text-pink-400", fn: onOpenCreativeSynthesis },
        { icon: Mic, label: "ShadowTalk Live", color: "text-blue-400", fn: onOpenShadowTalkLive },
        { icon: Compass, label: "AI Browser", color: "text-cyan-400", fn: onOpenBrowser },
        { icon: FileText, label: "New Artifact", color: "text-amber-400", fn: () => onOpenCanvas("document") },
        { icon: Zap, label: "Code Canvas", color: "text-primary", fn: () => onOpenCanvas("code") },
      ].map(({ icon: Icon, label, color, fn }) => (
        <button
          key={label}
          type="button"
          onClick={runTool(fn, onClose)}
          className="flex w-full items-center gap-3 rounded-xl py-2.5 px-3 hover:bg-white/5 text-left"
        >
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-[13px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  </div>
);

const ToolsHubMenu = ({
  open,
  onOpenChange,
  useMobileSheet,
  ...handlers
}: ToolsHubHandlers & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  useMobileSheet?: boolean;
}) => {
  if (useMobileSheet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[85dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Tools</SheetTitle>
          </SheetHeader>
          <ToolsHubMenuContent {...handlers} onClose={() => onOpenChange?.(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="sr-only" aria-hidden tabIndex={-1}>
          <LayoutGrid className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-72 p-0 bg-[#1e1f20]/98 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl">
        <ToolsHubMenuContent {...handlers} onClose={() => onOpenChange?.(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ChatHeader = ({
  userPlan,
  personality,
  onPersonalityChange,
  onToggleSidebar,
  onExport,
  onManageSubscription,
  onSignOut,
  onOpenAnalytics,
  onOpenScriptAutomation,
  onOpenStealthVault,
  onOpenAgentWorkflows,
  onOpenModelFineTuning,
  onOpenWhiteLabelBranding,
  onOpenGeminiAnalytics,
  onOpenCanvas,
  onOpenDeepResearch,
  onOpenGoogleIntegration,
  onOpenMusicGenerator,
  onOpenAgenticRunner,
  onOpenVisualReasoning,
  onOpenCreativeSynthesis,
  onOpenImageGenerator,
  onOpenShadowTalkLive,
  onOpenBrowser,
  aiProvider,
  onProviderChange,
  hasKeyForProvider,
  variant = "full",
  toolsMenuOpen,
  onToolsMenuOpenChange,
}: ChatHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const userInitials = user?.email ? user.email.charAt(0).toUpperCase() : "G";
  // FREE ACCESS TRANSITION: nothing to upgrade to — Upgrade buttons removed.
  void userPlan;
  const showUpgrade = false;

  const toolsHandlers = {
    onOpenDeepResearch,
    onOpenGoogleIntegration,
    onOpenImageGenerator,
    onOpenMusicGenerator,
    onOpenAgenticRunner,
    onOpenVisualReasoning,
    onOpenCreativeSynthesis,
    onOpenShadowTalkLive,
    onOpenBrowser,
    onOpenCanvas,
  };

  if (variant === "minimal") {
    return (
      <>
        <div className="flex md:hidden items-center justify-between px-3 py-1.5 shrink-0 safe-top">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/home")}
            className="gap-1.5 rounded-full border-border/60 bg-background/70 backdrop-blur-md shadow-sm h-8 px-3 text-xs"
            aria-label="Back to home"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Button>
          {showUpgrade && (
            <Button
              onClick={() => navigate("/pricing")}
              className="rounded-full h-8 px-3 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium shadow-sm touch-target"
            >
              <Sparkles className="h-3 w-3" />
              Upgrade
            </Button>
          )}
        </div>
        <div className="hidden md:flex items-center justify-between px-4 py-3 md:px-8 bg-transparent relative z-20 shrink-0 safe-top">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/home")}
              className="gap-2 rounded-full border-border/60 bg-background/70 backdrop-blur-md shadow-sm h-9 px-3"
              aria-label="Back to home"
            >
              <Home className="h-4 w-4" />
              <span className="text-sm">Back to Home</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/20"
              aria-label="Open history"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToolsMenuOpenChange?.(true)}
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/20"
              aria-label="Tools"
            >
              <LayoutGrid className="h-5 w-5 text-primary" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {showUpgrade && (
              <Button
                onClick={() => navigate("/pricing")}
                className="rounded-full h-9 px-4 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
        <ToolsHubMenu
          open={toolsMenuOpen}
          onOpenChange={onToolsMenuOpenChange}
          useMobileSheet={isMobile}
          {...toolsHandlers}
        />
      </>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 md:px-6 bg-transparent relative z-20">
      {/* Left: Menu & Model */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleSidebar} 
          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
        >
          <Menu className="h-[22px] w-[22px]" />
        </Button>
        
        <div className="hidden sm:block h-4 w-px bg-white/10 mx-1" />
        
        <ConnectionStatusIndicator />
        <div className="hidden sm:block h-4 w-px bg-white/10 mx-1" />
        <BunkerModeToggle />
      </div>

      {/* Right: Tools & User */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Personality Selector */}
        <Select value={personality} onValueChange={(v) => onPersonalityChange(v as Personality)}>
          <SelectTrigger className="w-[110px] md:w-[130px] h-9 rounded-full border-white/10 bg-white/5 hover:bg-white/10 transition-all focus:ring-0 focus:ring-offset-0 hidden sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl bg-[#1e1f20]/95 backdrop-blur-2xl border-white/10 shadow-2xl">
            {personalities.map(p => (
              <SelectItem key={p.value} value={p.value} className="rounded-xl py-2.5 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  {p.icon}
                  <span className="text-[13px] font-medium">{p.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToolsMenuOpenChange?.(true)}
          className="h-10 w-10 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all"
          aria-label="Tools"
        >
          <LayoutGrid className="h-5 w-5 text-primary" />
        </Button>
        <ToolsHubMenu
          open={toolsMenuOpen}
          onOpenChange={onToolsMenuOpenChange}
          {...toolsHandlers}
        />

        {/* User Profile / Unified Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-500 to-violet-500 blur-sm opacity-0 group-hover:opacity-40 transition-all duration-500" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[#1e1f20] to-[#2b2c2d] border border-white/10 flex items-center justify-center text-[14px] font-bold text-white shadow-xl">
                {userInitials}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 bg-[#1e1f20]/98 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl">
            <div className="px-4 py-4 mb-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-violet-500 flex items-center justify-center text-[14px] font-bold text-white">
                {userInitials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold truncate">{user?.email?.split('@')[0]}</span>
                <Badge className="w-fit mt-1 h-5 text-[9px] px-2 bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-widest font-bold">
                  {userPlan}
                </Badge>
              </div>
            </div>
            
            <DropdownMenuSeparator className="bg-white/5 my-1" />
            
            <div className="space-y-0.5">
              <DropdownMenuItem onClick={onOpenAnalytics} className="gap-3 rounded-xl py-3 px-4">
                <Target className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-[14px] font-medium">Performance Hub</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageSubscription} className="gap-3 rounded-xl py-3 px-4">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="text-[14px] font-medium">Billing — everything is free</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenGeminiAnalytics} className="gap-3 rounded-xl py-3 px-4">
                <Settings className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-[14px] font-medium">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport} className="gap-3 rounded-xl py-3 px-4">
                <Download className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-[14px] font-medium">Export History</span>
              </DropdownMenuItem>
            </div>
            
            <DropdownMenuSeparator className="bg-white/5 my-1" />
            
            <DropdownMenuItem onClick={onSignOut} className="gap-3 rounded-xl py-3 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all">
              <LogOut className="h-4 w-4" />
              <span className="text-[14px] font-bold">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
