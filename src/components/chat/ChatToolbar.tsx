import React from "react";
import { motion } from "framer-motion";
import { MessageSquarePlus, History, Eraser, Trash2, Settings, Phone } from "lucide-react";
import { ChatEncryptionToggle } from "@/components/chat/ChatEncryptionToggle";

import { HardwareTurboBadge } from "@/components/chat/HardwareTurboBadge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface ChatToolbarProps {
  hasActiveChat: boolean;
  conversationCount: number;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onClearChat: () => void;
  onDeleteAllChats: () => void;
  encryptionActive?: boolean;
  encryptionBusy?: boolean;
  onEnableEncryption?: () => void | Promise<void>;
  onDisableEncryption?: () => void;
  onToggleLiveVoice?: () => void;
  className?: string;
}

function ChatToolbarInner({
  hasActiveChat,
  conversationCount,
  onNewChat,
  onOpenHistory,
  onClearChat,
  onDeleteAllChats,
  encryptionActive = false,
  encryptionBusy = false,
  onEnableEncryption,
  onDisableEncryption,
  onToggleLiveVoice,
  className = "",
}: ChatToolbarProps) {
  const navigate = useNavigate();
  const { headerReveal } = useSettingsMotion();

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        variants={headerReveal}
        initial="hidden"
        animate="visible"
        className={`hidden md:flex items-center gap-1 px-4 md:px-6 py-2 border-b border-border/40 glass-subtle shrink-0 overflow-x-auto scrollbar-none ${className}`}
      >


        <HardwareTurboBadge />
        <div className="ml-auto flex items-center gap-1">
        {onEnableEncryption && onDisableEncryption && (
          <ChatEncryptionToggle
            active={encryptionActive}
            busy={encryptionBusy}
            onEnable={onEnableEncryption}
            onDisable={onDisableEncryption}
          />
        )}

        {onToggleLiveVoice && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleLiveVoice}
                className="h-8 gap-1.5 rounded-full text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Live Voice</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start live voice conversation</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/settings")}
              className="h-8 gap-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:border-primary/20 border border-transparent"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Chat & AI settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onNewChat}
              className="h-8 gap-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start a new conversation</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenHistory}
              className="h-8 gap-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>View chat history</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearChat}
              disabled={!hasActiveChat}
              className="h-8 gap-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30"
            >
              <Eraser className="h-4 w-4" />
              <span className="hidden sm:inline">Clear chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear messages in this chat</TooltipContent>
        </Tooltip>

        </div>

        {conversationCount > 0 && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete all</span>
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Delete all conversations</TooltipContent>
            </Tooltip>
            <AlertDialogContent className="bg-card border-border rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes every conversation and message in your history. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteAllChats}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </motion.div>
    </TooltipProvider>
  );
}

export const ChatToolbar = React.memo(ChatToolbarInner);

