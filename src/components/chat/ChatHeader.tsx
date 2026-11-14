import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Bot, ArrowLeft, Home, LogOut, Settings, Download, Lock, Crown, Star, Zap, Menu,
  Search, Image, Play, Eye, Wand2, Compass, FileText, Mic, AudioLines, MoreVertical, Music,
  LayoutGrid, Sparkles, MessageCircle, Briefcase, Heart, Laugh, Lightbulb,
  Scale, Target, HelpCircle, Share2, Plus, Pin, Mail, KeyRound,
  PanelLeft, ChevronDown, CircleCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { useAIKeyContext } from "@/contexts/AIKeyContext";

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

import type { AIProvider } from "@/lib/aiProviders";
import { ViralShareButton } from "@/components/chat/ViralShareButton";
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
  onSignOut: () => void;
  onOpenCanvas: (type: "document" | "code") => void;
  aiProvider?: AIProvider;
  onProviderChange?: (provider: AIProvider) => void;
  hasKeyForProvider?: (provider: AIProvider) => boolean;
  maxChats: string;
  dailyChats: number;
  variant?: "full" | "minimal";
  toolsMenuOpen?: boolean;
  onToolsMenuOpenChange?: (open: boolean) => void;
  onOpenByok?: () => void;
  onOpenKeySettings?: () => void;
}



const ChatHeaderInner = ({
  userPlan,
  personality,
  onPersonalityChange,
  onToggleSidebar,
  onSignOut,
  onOpenCanvas,
  aiProvider,
  onProviderChange,
  hasKeyForProvider,
  variant = "full",
  toolsMenuOpen,
  onToolsMenuOpenChange,
  onOpenByok,
  onOpenKeySettings,
}: ChatHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { userCohort, remainingMessages, maxDailyLimit } = useAIKeyContext();
  
  const userInitials = user?.email ? user.email.charAt(0).toUpperCase() : "G";
  // FREE ACCESS TRANSITION: nothing to upgrade to — Upgrade buttons removed.
  void userPlan;
  const showUpgrade = false;



  if (variant === "minimal") {
    return (
      <>
        {/* Mobile bar — same actions, compact */}
        <div className="ios-glass-nav flex md:hidden items-center justify-between gap-2 px-3 py-2 shrink-0 safe-top">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.assign("/home")}
            className="gap-1.5 rounded-full border-border/60 bg-background/70 backdrop-blur-md shadow-sm h-9 px-3 text-xs touch-target"
            aria-label="Back to home"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Button>
          {/* Cohort badge — mobile */}
          {userCohort && onOpenKeySettings && (
            <button
              type="button"
              onClick={onOpenKeySettings}
              className={
                "gap-1 rounded-full border backdrop-blur-md shadow-sm h-9 px-2.5 text-[11px] font-semibold flex items-center transition-colors touch-target " +
                (userCohort === 'TECH'
                  ? "border-indigo-500/30 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50"
                  : "border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50")
              }
              aria-label="API key settings"
            >
              {userCohort === 'TECH' ? (
                <>
                  <Zap className="h-3 w-3" />
                  <span>BYOK</span>
                </>
              ) : (
                <>
                  <span>{remainingMessages}/{maxDailyLimit}</span>
                </>
              )}
            </button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenByok}
            className="gap-1.5 rounded-full border-border/60 bg-background/70 backdrop-blur-md shadow-sm h-9 px-3 text-xs touch-target"
            aria-label="Add your own API key"
          >
            <KeyRound className="h-3.5 w-3.5" />
            BYOK
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

        {/* Desktop top bar — model switcher left, minimal actions right */}
        <div className="hidden md:flex h-14 px-5 items-center justify-between shrink-0 bg-[#131314]/90 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Model dropdown selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl hover:bg-white/[0.06] text-slate-200 hover:text-white transition-colors group"
                  aria-label="Select model"
                >
                  <span className="text-base font-semibold tracking-tight text-white">ShadowTalk 2.5 Ultra</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-2xl bg-[#1e1e20]/95 backdrop-blur-2xl border border-white/10 shadow-2xl">
                <DropdownMenuItem className="gap-2.5 rounded-lg py-2.5" disabled>
                  <CircleCheck className="h-4 w-4 text-sky-400" />
                  <span className="text-[13px] font-medium text-white">ShadowTalk 2.5 Ultra</span>
                  <span className="ml-auto text-[10px] text-slate-500">House model</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5 my-1" />
                {onOpenByok && (
                  <DropdownMenuItem
                    onClick={onOpenByok}
                    className="gap-2.5 rounded-lg py-2.5 cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    <span className="text-[13px]">Bring your own API key</span>
                  </DropdownMenuItem>
                )}
                {onOpenKeySettings && (
                  <DropdownMenuItem
                    onClick={onOpenKeySettings}
                    className="gap-2.5 rounded-lg py-2.5 cursor-pointer"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span className="text-[13px]">API key settings</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <ViralShareButton className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="p-2 rounded-lg hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* User Profile / Unified Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Account and more actions" className="w-7 h-7 ml-1 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white font-medium text-xs shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60">
                  {userInitials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 bg-[#1e1e20]/98 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl">
                <div className="px-4 py-4 mb-1 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-[14px] font-bold text-white">
                    {userInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-bold truncate text-white">{user?.email?.split('@')[0]}</span>
                    <Badge className="w-fit mt-1 h-5 text-[9px] px-2 bg-sky-500/10 text-sky-400 border-sky-500/20 uppercase tracking-widest font-bold">
                      {userPlan}
                    </Badge>
                  </div>
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
          aria-label="Toggle sidebar"
        >
          <Menu className="h-[22px] w-[22px]" />
        </Button>
        
        <div className="hidden sm:block h-4 w-px bg-white/10 mx-1" />
        

        <div className="hidden sm:block h-4 w-px bg-white/10 mx-1" />

      </div>

      {/* Right: Tools & User */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Personality Selector */}
        <Select value={personality} onValueChange={(v) => onPersonalityChange(v as Personality)}>
          <SelectTrigger
            aria-label="Assistant personality"
            className="w-[110px] md:w-[130px] h-9 rounded-full border-white/10 bg-white/5 hover:bg-white/10 transition-all focus:ring-0 focus:ring-offset-0 hidden sm:flex"
          >
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



        {/* User Profile / Unified Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Account and more actions" className="relative group cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-500 to-violet-500 blur-sm opacity-0 group-hover:opacity-40 transition-all duration-500" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[#1e1f20] to-[#2b2c2d] border border-white/10 flex items-center justify-center text-[14px] font-bold text-white shadow-xl">
                {userInitials}
              </div>
            </button>
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

export const ChatHeader = React.memo(ChatHeaderInner);

