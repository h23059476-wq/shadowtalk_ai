import { useState } from "react";
import { Copy, Gift, X, Share2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferralModal = ({ isOpen, onClose }: ReferralModalProps) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Generate a fake referral link for now, could be real with user UID
  const referralLink = `https://www.shadowtalk-ai.com/?ref=${((user as any)?.uid ?? (user as any)?.id) || 'guest_invite_5k'}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnX = () => {
    const text = encodeURIComponent("I'm using ShadowTalk AI to run autonomous missions and write code locally in my browser. Try it for free:");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}&via=shadowtalk_ai`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden relative"
          >
            {/* Ambient Background */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent opacity-50 pointer-events-none" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-10 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 pt-10 text-center relative z-10">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20 shadow-inner">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Invite Friends, Get Premium</h2>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Help us reach 5,000 users this month! Invite 3 friends to ShadowTalk AI and unlock a free month of Premium features (Deep Research, Video Studio).
              </p>

              <div className="bg-muted/30 p-1 rounded-xl flex items-center gap-2 border border-border/50 mb-6">
                <code className="flex-1 text-xs text-muted-foreground truncate px-3 py-2 text-left">
                  {referralLink}
                </code>
                <Button size="sm" onClick={copyToClipboard} className="shrink-0 rounded-lg px-3 gap-1.5 h-8">
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full gap-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white border-none shadow-md"
                  onClick={shareOnX}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Share on X (Twitter)
                </Button>
              </div>
              
              <p className="text-[11px] text-muted-foreground mt-6">
                Referrals are tracked locally and bound to your account UID. You will receive an alert when a friend joins.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
