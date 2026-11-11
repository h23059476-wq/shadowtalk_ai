import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogIn, Sparkles, Zap, Shield, Cloud } from "lucide-react";

interface SignInPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'chats' | 'images' | 'deepResearch' | 'general';
  usedCount?: number;
  limitCount?: number;
}

/** Free-access sign-in prompt: ShadowTalk is free; sign-in adds continuity,
 *  sync, and encrypted vault access. No paid tiers, no upgrade messaging. */
export function SignInPrompt({ open, onOpenChange, reason }: SignInPromptProps) {
  void reason;
  const navigate = useNavigate();

  const reasonMessages = {
    chats: {
      title: "Sign in to keep your chats",
      description: "ShadowTalk AI is free to use. Signing in saves your history across devices.",
      icon: Zap,
      benefits: [
        "Conversation history saved to your account",
        "Encrypted Stealth Vault for sensitive work",
        "Projects and memory that follow you",
        "Everything stays free — no subscription",
      ]
    },
    images: {
      title: "Sign in to keep your creations",
      description: "ShadowTalk AI is free to use. Signing in keeps your gallery with you.",
      icon: Sparkles,
      benefits: [
        "Images saved to your gallery",
        "History across devices",
        "Encrypted vault storage",
        "Everything stays free — no subscription",
      ]
    },
    deepResearch: {
      title: "Sign in to keep your research",
      description: "ShadowTalk AI is free to use. Signing in keeps your research reports.",
      icon: Shield,
      benefits: [
        "Multi-source analysis with citations",
        "Export research reports",
        "Knowledge graph and memory",
        "Everything stays free — no subscription",
      ]
    },
    general: {
      title: "Sign in to continue",
      description: "Create a free account — ShadowTalk AI is free to use.",
      icon: Cloud,
      benefits: [
        "Save your conversations",
        "Access all AI features",
        "Sync across devices",
        "Bring your own AI provider API key",
      ]
    }
  };

  const config = reasonMessages[reason];
  const Icon = config.icon;

  const handleSignIn = () => {
    navigate('/auth');
    onOpenChange(false);
  };

  const handleContinueGuest = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{config.title}</DialogTitle>
          <DialogDescription className="text-center">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground mb-3">
              Sign in to unlock:
            </p>
            {config.benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {benefit}
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 rounded-lg p-3">
            <p className="text-xs font-medium text-success flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Free to use — no credit card
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Bring your own AI provider API key and choose your models. Your
              provider may charge separately for API usage.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleSignIn} className="w-full gap-2">
            <LogIn className="w-4 h-4" />
            Sign In / Create Account
          </Button>
          <Button variant="ghost" onClick={handleContinueGuest} className="w-full text-muted-foreground">
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
