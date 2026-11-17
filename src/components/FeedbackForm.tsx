import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquareHeart, Star, Send } from "lucide-react";
import { backend } from "@/integrations/local/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categories = [
  { value: "general", label: "General Feedback" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "improvement", label: "Improvement Suggestion" },
  { value: "other", label: "Other" },
];

interface FeedbackFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export const FeedbackForm = ({ open: controlledOpen, onOpenChange, hideTrigger }: FeedbackFormProps = {}) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    category: "general",
    rating: 0,
    message: "",
  });

  const handleRatingClick = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      toast.error("Please enter your feedback message");
      return;
    }

    if (formData.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);
    try {
      const categoryLabel =
        categories.find((cat) => cat.value === formData.category)?.label ?? "General Feedback";
      const contactEmail = formData.email.trim() || user?.email || "";
      const name =
        (user?.user_metadata?.display_name as string | undefined)?.trim() ||
        (user?.user_metadata?.full_name as string | undefined)?.trim() ||
        contactEmail ||
        "Anonymous user";
      // The gateway requires a valid email when one is provided; anonymous
      // users may omit it entirely.
      const body = {
        name: name.slice(0, 256),
        subject: `[FEEDBACK] ${categoryLabel} — rated ${formData.rating}/5`,
        message: `${formData.message.trim()}\n\n— Rating: ${formData.rating}/5\n— Category: ${categoryLabel}`,
        source: "In-app Feedback Form",
        ...(contactEmail ? { email: contactEmail } : {}),
      };

      // invoke() RESOLVES with { error } instead of throwing on HTTP failures,
      // so the error must be checked explicitly (same contract as ContactPage).
      const { error: invokeError } = await backend.functions.invoke("sendContactEmail", { body });
      if (invokeError) {
        throw invokeError instanceof Error ? invokeError : new Error(String(invokeError));
      }

      toast.success("Thank you for your feedback! It was sent to the team.");
      setFormData({ email: "", category: "general", rating: 0, message: "" });
      setOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      // Honest failure: keep a local copy so the message is never lost.
      try {
        const backlog = JSON.parse(localStorage.getItem("shadowtalk_feedback_backlog") || "[]");
        backlog.unshift({
          ...formData,
          submittedAt: new Date().toISOString(),
          status: "delivery-failed",
        });
        localStorage.setItem("shadowtalk_feedback_backlog", JSON.stringify(backlog.slice(0, 20)));
      } catch {}
      toast.error(
        "Feedback couldn't be delivered just now. Please email zain@shadowtalk-ai.com directly.",
        { duration: 8000 },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquareHeart className="h-4 w-4" />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-primary" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            We'd love to hear your thoughts on how we can improve ShadowTalk AI.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email (only for non-authenticated users) */}
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      star <= formData.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground hover:text-yellow-400"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback</Label>
            <Textarea
              id="message"
              placeholder="Tell us what you think..."
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.message.length}/1000
            </p>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <Send className="h-4 w-4" />
            {loading ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
