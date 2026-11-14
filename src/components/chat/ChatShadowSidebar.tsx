import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Trash2,
  Archive,
  Settings,
  PanelLeft,
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { settingsHapticTick } from "@/lib/settingsFeedback";
import { CHAT_SIDEBAR_WIDTH_COLLAPSED, CHAT_SIDEBAR_WIDTH_EXPANDED } from "@/lib/chatSidebarNav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

import { ChatSidebarNavList } from "@/components/chat/ChatSidebarNavList";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  archived_at?: string | null;
}

interface ChatShadowSidebarProps {
  userInitials: string;
  userDisplayName: string;
  onNewChat: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileDrawer?: boolean;
  forceExpanded?: boolean;
  onNavigate?: () => void;

  conversations?: Conversation[];
  currentConversationId?: string | null;
  isArchived?: (conversation: Conversation) => boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onOpenSettings?: () => void;
}

function cleanProfileName(raw: string): string {
  if (!raw || raw.trim() === "" || raw.toLowerCase() === "there") {
    return "User";
  }
  const first = raw.trim().split(" ")[0].split("@")[0];
  const cleaned = first.replace(/\d+$/, "");
  const target = cleaned.length >= 2 ? cleaned : first;
  return target.charAt(0).toUpperCase() + target.slice(1);
}

const SIDEBAR_EASE = [0.2, 0.8, 0.2, 1] as const;

function ChatShadowSidebarInner({
  userInitials,
  userDisplayName,
  onNewChat,
  collapsed = false,
  onToggleCollapse,
  mobileDrawer = false,
  forceExpanded = false,
  onNavigate,
  conversations = [],
  currentConversationId,
  isArchived = () => false,
  onSelect,
  onDelete,
  onArchive,
  onOpenSettings,
}: ChatShadowSidebarProps) {
  const navigate = useNavigate();
  const { userPlan } = useAuth();
  const isCollapsed = forceExpanded ? false : collapsed;
  const width = isCollapsed ? CHAT_SIDEBAR_WIDTH_COLLAPSED : CHAT_SIDEBAR_WIDTH_EXPANDED;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const formattedName = useMemo(() => cleanProfileName(userDisplayName), [userDisplayName]);
  const activeConversations = conversations.filter((c) => !isArchived(c));
  const planLabel =
    userPlan === "free" ? "Free Plan" : `${userPlan.charAt(0).toUpperCase()}${userPlan.slice(1)} Plan Active`;

  return (
    <TooltipProvider delayDuration={250}>
      <motion.aside
        initial={false}
        animate={{ width }}
        transition={{ duration: 0.28, ease: SIDEBAR_EASE }}
        className={cn(
          "shrink-0 flex flex-col relative z-30 overflow-hidden select-none will-change-[width] bg-sidebar-background text-foreground",
          mobileDrawer
            ? "flex h-full min-h-0"
            : "hidden md:flex h-full min-h-0 border-r border-sidebar-border"
        )}
      >
        {/* Top Header: Brand & Collapse */}
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between shrink-0 overflow-hidden">
          <motion.div
            animate={{
              opacity: isCollapsed ? 0 : 1,
              x: isCollapsed ? -8 : 0,
            }}
            transition={{ duration: 0.2, ease: SIDEBAR_EASE }}
            className={cn(
              "flex items-center space-x-2 overflow-hidden whitespace-nowrap min-w-0",
              isCollapsed && "pointer-events-none"
            )}
          >
            <div className="w-6 h-6 shrink-0 rounded-lg bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              S
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">ShadowTalk</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              PRO
            </span>
          </motion.div>

          {onToggleCollapse && !mobileDrawer && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    settingsHapticTick();
                    onToggleCollapse();
                  }}
                  className="p-1.5 shrink-0 text-slate-400 hover:text-foreground rounded-lg hover:bg-white/[0.06] transition-colors"
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* New Chat Pill Button */}
        <div className="px-3 py-1.5 shrink-0 overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                type="button"
                onClick={() => {
                  settingsHapticTick();
                  onNewChat();
                }}
                animate={{
                  width: isCollapsed ? 40 : "100%",
                }}
                transition={{ duration: 0.25, ease: SIDEBAR_EASE }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group flex items-center rounded-xl h-9 mx-auto transition-all",
                  "bg-white/[0.05] hover:bg-white/[0.09] border border-white/5 text-foreground hover:text-foreground",
                  isCollapsed ? "justify-center px-0" : "justify-between px-3"
                )}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-foreground transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  <motion.span
                    animate={{
                      opacity: isCollapsed ? 0 : 1,
                      width: isCollapsed ? 0 : "auto",
                    }}
                    transition={{ duration: 0.18, ease: SIDEBAR_EASE }}
                    className="text-xs font-medium tracking-wide whitespace-nowrap overflow-hidden text-left"
                  >
                    New chat
                  </motion.span>
                </div>
                {!isCollapsed && (
                  <kbd className="hidden sm:inline-block text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-black/30 border border-white/5">
                    ⌘K
                  </kbd>
                )}
              </motion.button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">New chat (⌘K)</TooltipContent>}
          </Tooltip>
        </div>

        {/* Scrollable Navigation & Recents */}
        <ScrollArea className="flex-1 px-3 py-2 custom-scrollbar">
          <div className="pb-4 space-y-4">
            {/* Primary Real-Feature Navigation — ALWAYS single mounted instance */}
            <div className="text-xs font-normal -mx-1">
              <ChatSidebarNavList collapsed={isCollapsed} onItemClick={onNavigate} />
            </div>

            {/* Recent Chats */}
            {activeConversations.length > 0 && (
              <motion.div
                initial={false}
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  height: isCollapsed ? 0 : "auto",
                }}
                transition={{ duration: 0.22, ease: SIDEBAR_EASE }}
                className="overflow-hidden space-y-0.5 text-xs font-normal"
                style={{ pointerEvents: isCollapsed ? "none" : "auto" }}
              >
                <span className="block px-2.5 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  Recent
                </span>
                <div className="mt-1 space-y-0.5">
                  {activeConversations.map((conv) => {
                    const isActive = currentConversationId === conv.id;
                    const isHovered = hoveredId === conv.id;
                    return (
                      <div
                        key={conv.id}
                        onMouseEnter={() => setHoveredId(conv.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="relative"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            settingsHapticTick();
                            onSelect?.(conv.id);
                          }}
                          className={cn(
                            "relative w-full flex items-center space-x-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 group overflow-hidden",
                            isActive
                              ? "bg-white/[0.08] text-foreground font-medium"
                              : "text-slate-400 hover:text-foreground hover:bg-white/[0.04]"
                          )}
                        >
                          <MessageSquare
                            className={cn(
                              "w-3.5 h-3.5 shrink-0 transition-colors",
                              isActive ? "text-sky-400" : "text-slate-400"
                            )}
                          />
                          <span className="flex-1 text-[13px] truncate pr-4 whitespace-nowrap">{conv.title || "Untitled chat"}</span>

                          <div
                            className={cn(
                              "absolute right-2 flex items-center gap-1 opacity-0 transition-opacity",
                              (isHovered || isActive) && "opacity-100"
                            )}
                          >
                            <button
                              type="button"
                              className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchive?.(conv.id);
                              }}
                              title="Archive"
                            >
                              <Archive className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(conv.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Bottom User Profile Card */}
        <div className="p-3 shrink-0 border-t border-sidebar-border bg-sidebar-background overflow-hidden">
          <div
            className={cn(
              "w-full flex items-center justify-between text-left group",
              isCollapsed && "justify-center"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    settingsHapticTick();
                    navigate("/profile");
                    onNavigate?.();
                  }}
                  className={cn(
                    "flex items-center space-x-2.5 p-2 rounded-xl hover:bg-white/[0.05] transition-colors overflow-hidden",
                    isCollapsed ? "px-0" : "flex-1 min-w-0"
                  )}
                >
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-foreground font-medium text-xs shadow-sm">
                    {userInitials || "U"}
                  </div>
                  <motion.div
                    animate={{
                      opacity: isCollapsed ? 0 : 1,
                      width: isCollapsed ? 0 : "auto",
                    }}
                    transition={{ duration: 0.18, ease: SIDEBAR_EASE }}
                    className="flex flex-col min-w-0 text-left whitespace-nowrap overflow-hidden"
                  >
                    <span className="text-xs font-medium text-foreground group-hover:text-foreground truncate">{formattedName}</span>
                    <span className="text-[11px] text-slate-400 truncate">{planLabel}</span>
                  </motion.div>
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">{userDisplayName || "Profile & Account"}</TooltipContent>}
            </Tooltip>

            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      settingsHapticTick();
                      if (onOpenSettings) onOpenSettings();
                      else navigate("/settings");
                    }}
                    className="p-1 shrink-0 text-slate-400 group-hover:text-foreground hover:text-foreground transition-colors rounded-lg"
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Settings</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

export const ChatShadowSidebar = React.memo(ChatShadowSidebarInner);
