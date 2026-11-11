import { useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Camera, Calendar, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { uploadProfileAvatar } from "@/lib/avatarUpload";
import { backend } from "@/integrations/local/client";
import { SettingsStagger, SettingsStaggerItem } from "@/components/settings/SettingsStagger";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";

interface ProfileTabProps {
  userId: string;
  displayName: string;
  setDisplayName: (v: string) => void;
  email: string;
  bio: string;
  setBio: (v: string) => void;
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  createdAt?: string;
}

export const ProfileTab = ({
  userId,
  displayName,
  setDisplayName,
  email,
  bio,
  setBio,
  avatarUrl,
  setAvatarUrl,
  createdAt,
}: ProfileTabProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlSaved, setUrlSaved] = useState(false);

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadProfileAvatar(userId, file);
    setUploading(false);
    if ("error" in result) {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
      return;
    }
    setAvatarUrl(result.publicUrl);
    // Auto-save the avatar URL to Firestore immediately
    await saveAvatarUrl(result.publicUrl);
    toast({ title: "Photo updated", description: "Your profile picture was saved." });
  };

  // Auto-save avatar URL when user pastes a URL and clicks away (onBlur)
  const saveAvatarUrl = useCallback(async (url: string) => {
    if (!userId || !url) return;
    setSavingUrl(true);
    setUrlSaved(false);
    try {
      const { error } = await backend
        .from("profiles")
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      setUrlSaved(true);
      setTimeout(() => setUrlSaved(false), 2000);
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: "Could not save avatar URL. Try the Save button.",
        variant: "destructive",
      });
    } finally {
      setSavingUrl(false);
    }
  }, [userId, toast]);

  const handleUrlBlur = () => {
    if (avatarUrl && avatarUrl.trim()) {
      void saveAvatarUrl(avatarUrl.trim());
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur(); // trigger onBlur which saves
    }
  };

  const shortId = `${userId.slice(0, 8)}…${userId.slice(-4)}`;

  const { spring, reduced } = useSettingsMotion();

  return (
    <SettingsStagger className="space-y-6">
      <SettingsStaggerItem>
      <motion.div whileHover={reduced ? undefined : { y: -2 }} transition={spring}>
      <Card className="card-glass border-border/50 card-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Profile Information
          </CardTitle>
          <CardDescription>Your identity across ShadowTalk — avatar saves automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="relative group shrink-0"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Avatar className="h-24 w-24 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                  {displayName?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full shadow-lg">
                {uploading ? (
                  <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onPickAvatar(e.target.files?.[0])}
            />
            <div className="flex-1 space-y-2">
              <Label className="text-xs text-muted-foreground">Profile photo URL</Label>
              <p className="text-xs text-muted-foreground">
                Click the avatar to upload, or paste an image URL — it saves automatically.
              </p>
              <div className="relative">
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="https://… or upload via camera button"
                  maxLength={500000}
                  className="bg-muted/30 border-border/50 pr-8"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {savingUrl ? (
                    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  ) : urlSaved ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-border/30" />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
                className="bg-muted/30 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-muted/50 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Bio</Label>
              <span className="text-xs text-muted-foreground">{bio.length}/500</span>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others a bit about yourself..."
              rows={4}
              maxLength={500}
              className="bg-muted/30 border-border/50 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" /> Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Member Since</p>
              <p className="text-sm font-semibold">
                {createdAt
                  ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  : "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">User ID</p>
              <p className="text-sm font-mono font-semibold truncate" title={userId}>
                {shortId}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
              <p className="text-sm font-semibold text-emerald-400">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
      </SettingsStaggerItem>
    </SettingsStagger>
  );
};
