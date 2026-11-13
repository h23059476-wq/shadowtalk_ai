import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SETTINGS_SPRING } from "@/lib/settingsMotion";
import { ChatShadowSidebar, Conversation } from "@/components/chat/ChatShadowSidebar";

interface ChatMobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  userInitials: string;
  userDisplayName: string;
  onNewChat: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  isArchived: (conversation: Conversation) => boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onOpenSettings: () => void;
}

export function ChatMobileNavDrawer({
  open,
  onClose,
  userInitials,
  userDisplayName,
  onNewChat,
  conversations,
  currentConversationId,
  isArchived,
  onSelect,
  onDelete,
  onArchive,
  onUnarchive,
  onOpenSettings,
}: ChatMobileNavDrawerProps) {
  // Escape closes the drawer; body scroll is locked while it is open so the
  // page behind (already mostly fixed by the chat shell) can never shift.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed left-0 top-0 bottom-0 z-[70] md:hidden shadow-elevated w-[min(86vw,20rem)]"
            role="dialog"
            aria-modal="true"
            aria-label="Conversations navigation"
          >
            <div className="relative h-full safe-bottom">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute right-2 top-2 z-40 h-9 w-9 rounded-xl text-cyan-400 bg-black/20 hover:bg-black/40"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </Button>
              <ChatShadowSidebar
                forceExpanded
                mobileDrawer
                userInitials={userInitials}
                userDisplayName={userDisplayName}
                onNewChat={() => {
                  onNewChat();
                  onClose();
                }}
                conversations={conversations}
                currentConversationId={currentConversationId}
                isArchived={isArchived}
                onSelect={(id) => {
                  onSelect(id);
                  onClose();
                }}
                onDelete={onDelete}
                onArchive={onArchive}
                onUnarchive={onUnarchive}
                onOpenSettings={() => {
                  onOpenSettings();
                  onClose();
                }}
                onNavigate={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
