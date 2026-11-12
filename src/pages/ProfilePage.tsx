import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { backend } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User, Bell, Shield, Save, Loader2, CreditCard, ExternalLink, Crown,
  Lock, KeyRound, LogOut, Trash2, Mail, Eye, EyeOff, CheckCircle2,
  AlertTriangle, Activity, Settings, Link2, Bot, Monitor,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SettingsAmbientBackground } from "@/components/settings/SettingsAmbientBackground";
import { SettingsProgressBar } from "@/components/settings/SettingsProgressBar";
import { ProfileNav, type ProfileNavTab } from "@/components/profile/ProfileNav";
import { ProfileLoading } from "@/components/profile/ProfileLoading";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";
import { useProfileSectionNav } from "@/hooks/useProfileSectionNav";
import type { ProfileTabId } from "@/lib/profileTypes";
import ReferralProgram from "@/components/ReferralProgram";
// Free-access transition: `PLAN_DETAILS` import from `@/lib/stripe` removed.
// See docs/audit/CLAIMS_REALITY_REPORT.md P1-1, P2-2.
import { MissionValueDashboard } from "@/components/MissionValueDashboard";
import { UsageHistoryTable } from "@/components/UsageHistoryTable";
import { CreditEmptyPrompt } from "@/components/CreditEmptyPrompt";
import { useShadowCredits } from "@/hooks/useShadowCredits";
import { TwoFactorSetup } from "@/components/profile/TwoFactorSetup";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTab } from "@/components/profile/ProfileTab";
import { ActivityTab } from "@/components/profile/ActivityTab";
import { PreferencesTab } from "@/components/profile/PreferencesTab";
import { AiSettingsTab } from "@/components/profile/AiSettingsTab";
import { NotificationsExtras } from "@/components/profile/NotificationsExtras";


import { AdminPanelLink } from "@/components/admin/AdminPanelLink";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Json } from "@/integrations/local/types";
import {
  DEFAULT_EXTENDED_NOTIF,
  NOTIFICATION_PREFS_KEY,
  parseExtendedNotif,
  type ExtendedNotificationPrefs,
} from "@/lib/profileNotificationSettings";
import {
  getNotifProductUpdates,
  getNotifSecurityAlerts,
  getNotifWeeklyDigest,
  setNotifProductUpdates,
  setNotifSecurityAlerts,
  setNotifWeeklyDigest,
} from "@/lib/profilePreferences";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  notification_email: boolean;
  notification_push: boolean;
  notification_mentions: boolean;
  created_at?: string;
}

const PROFILE_TABS = new Set([
  "profile",
  "activity",
  "notifications",
  "security",
  "ai",
  "preferences",
  "billing",
]);

const PROFILE_TAB_SECTIONS: readonly ProfileNavTab[] = [
  { id: "profile", label: "Profile", icon: User, desc: "Name, bio, avatar" },
  { id: "activity", label: "Activity", icon: Activity, desc: "Conversation history" },
  { id: "notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell, desc: "Email & push" },
  { id: "security", label: "Security", icon: Shield, desc: "2FA, password, vault" },
  { id: "ai", label: "AI", icon: Bot, desc: "Models & instructions" },
  { id: "preferences", label: "Preferences", shortLabel: "Prefs", icon: Settings, desc: "Appearance & UI" },
  { id: "billing", label: "Billing", icon: CreditCard, desc: "Plan & credits" },
];

const PROFILE_TAB_IDS = PROFILE_TAB_SECTIONS.map((t) => t.id);

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userPlan, subscribed, subscriptionEnd, signOut } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationPush, setNotificationPush] = useState(true);
  const [notificationMentions, setNotificationMentions] = useState(true);
  const [extendedNotif, setExtendedNotif] = useState<ExtendedNotificationPrefs>(DEFAULT_EXTENDED_NOTIF);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const notifSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Password change
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Free-access transition: paid plan tiers no longer exist. The previous
  // implementation imported `PLAN_DETAILS` from `@/lib/stripe` (dormant
  // Stripe config) and resolved the user's plan to one of free/byok/pro/
  // premium/elite. Under free-access, the canonical plan is "Free" for
  // everyone. See docs/audit/CLAIMS_REALITY_REPORT.md P1-1, P2-2.
  // `currentPlanDetails` was declared but never rendered in this file.
  const { balance, transactions, isLoading: creditsLoading } = useShadowCredits();

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const [profileRes, settingsRes] = await Promise.all([
      backend.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      backend
        .from("user_settings")
        .select("setting_value")
        .eq("user_id", user.id)
        .eq("setting_key", NOTIFICATION_PREFS_KEY)
        .maybeSingle(),
    ]);

    if (profileRes.error && profileRes.error.code !== "PGRST116") {
      console.error("Error loading profile:", profileRes.error);
    }

    const data = profileRes.data;
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || "");
      setNotificationEmail(data.notification_email ?? true);
      setNotificationPush(data.notification_push ?? true);
      setNotificationMentions(data.notification_mentions ?? true);
    } else {
      const defaultName = user.email?.split("@")[0] || "User";
      setDisplayName(defaultName);
      await backend.from("profiles").insert({ id: user.id, user_id: user.id, display_name: defaultName });
    }

    const ext = parseExtendedNotif(settingsRes.data?.setting_value);
    setExtendedNotif(ext);
    setNotifProductUpdates(ext.productUpdates);
    setNotifSecurityAlerts(ext.securityAlerts);
    setNotifWeeklyDigest(ext.weeklyDigest);

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    void loadProfile();
  }, [user, navigate, loadProfile]);

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (oauth === "success") {
      toast({ title: "Account linked", description: "Your integration was connected successfully." });
      setSearchParams({ tab: "linked" }, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);



  const persistProfile = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user) return false;
      const { error } = await backend.from("profiles").upsert({
        id: user.id,
        user_id: user.id,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        notification_email: notificationEmail,
        notification_push: notificationPush,
        notification_mentions: notificationMentions,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        if (!opts?.silent) {
          toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
        }
        return false;
      }
      return true;
    },
    [user, displayName, bio, avatarUrl, notificationEmail, notificationPush, notificationMentions, toast],
  );

  const persistExtendedNotif = useCallback(
    async (next: ExtendedNotificationPrefs) => {
      if (!user) return;
      setNotifProductUpdates(next.productUpdates);
      setNotifSecurityAlerts(next.securityAlerts);
      setNotifWeeklyDigest(next.weeklyDigest);
      await backend.from("user_settings").upsert(
        {
          user_id: user.id,
          setting_key: NOTIFICATION_PREFS_KEY,
          setting_value: next as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,setting_key" },
      );
    },
    [user],
  );

  const scheduleNotificationSave = useCallback(() => {
    if (notifSaveTimer.current) clearTimeout(notifSaveTimer.current);
    notifSaveTimer.current = setTimeout(async () => {
      const ok = await persistProfile({ silent: true });
      if (ok) {
        toast({ title: "Notification preferences saved" });
      }
    }, 600);
  }, [persistProfile, toast]);

  const saveProfile = async () => {
    if (!user) return;

    // Allow data URLs (base64 images) up to 500KB in the avatar_url field.
    // The avatar upload compresses to 200x200 JPEG (~10-50KB), which
    // produces a data URL of ~15,000-70,000 characters.
    if (avatarUrl && avatarUrl.length > 500_000) {
      toast({
        title: "Avatar too large",
        description: "Please use a smaller image (under 5MB).",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    const ok = await persistProfile();
    if (ok) {
      await persistExtendedNotif(extendedNotif);
      toast({ title: "Profile saved", description: "Your changes have been saved successfully" });
    }
    setIsSaving(false);
  };

  const handleExtendedNotifChange = (patch: Partial<ExtendedNotificationPrefs>) => {
    setExtendedNotif((prev) => {
      const next = { ...prev, ...patch };
      void persistExtendedNotif(next).then(() => {
        toast({ title: "Preference saved" });
      });
      return next;
    });
  };


  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await backend.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "Your password has been changed successfully" });
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to change password", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/chatbot");
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const uid = user?.id;
      if (!uid) throw new Error("Sign in again before deleting your account.");
      const { data, error } = await backend.functions.invoke("deleteAccount");
      if (error) throw error;
      if (!data?.deleted) throw new Error("Account deletion did not complete. Please try again.");

      // Remove this account's browser-side settings and credentials on this device.
      for (let index = localStorage.length - 1; index >= 0; index--) {
        const key = localStorage.key(index);
        if (key && (key.includes(uid) || key === `shadowtalk.byok.v2.${uid}`)) {
          localStorage.removeItem(key);
        }
      }
      toast({ title: "Account deleted", description: "Linked Firebase records and private receipt files were removed." });
      await signOut();
      navigate("/auth");
    } catch (err) {
      toast({
        title: "Deletion failed",
        description: err instanceof Error ? err.message : "Could not delete account. Please sign out and sign back in, then try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
      setDeleteConfirm("");
    }
  };

  const { sectionPanel, staggerItem, shouldAnimateAmbient } = useSettingsMotion();

  const currentTab = (() => {
    const tab = searchParams.get("tab") || "profile";
    return PROFILE_TABS.has(tab) ? (tab as ProfileTabId) : "profile";
  })();

  const tabMeta = PROFILE_TAB_SECTIONS.find((t) => t.id === currentTab) ?? PROFILE_TAB_SECTIONS[0];

  const selectTab = useCallback(
    (id: string) => setSearchParams({ tab: id }, { replace: true }),
    [setSearchParams],
  );

  const { direction, progress } = useProfileSectionNav(PROFILE_TAB_IDS, currentTab, selectTab);

  if (isLoading) {
    return <ProfileLoading />;
  }

  return (
    <div className="min-h-screen relative settings-scroll-smooth">
      <SettingsAmbientBackground enabled={shouldAnimateAmbient} />

      <div className="container mx-auto px-4 pt-4 max-w-6xl">
        <AdminPanelLink />
      </div>

      <ProfileHeader
        displayName={displayName}
        email={user?.email || ""}
        avatarUrl={avatarUrl}
        userPlan={userPlan}
        isSaving={isSaving}
        onSave={saveProfile}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <aside className="md:w-[240px] lg:w-[280px] shrink-0">
            <div className="md:rounded-2xl md:border md:border-border/50 md:glass-strong md:p-4 md:shadow-elevated">
              <ProfileNav tabs={PROFILE_TAB_SECTIONS} activeId={currentTab} onSelect={selectTab} />
            </div>
          </aside>

          <main className="flex-1 min-w-0 pb-20">
            <div className="rounded-2xl border border-border/40 bg-card/35 backdrop-blur-md p-4 sm:p-6 lg:p-8 shadow-card settings-panel-shine">
              <SettingsProgressBar
                progress={progress}
                sectionLabel={tabMeta.label}
                title="Your account"
              />

              {!creditsLoading && balance && (
                <motion.div variants={staggerItem} initial="hidden" animate="visible" className="mb-6">
                  <MissionValueDashboard transactions={transactions} balance={balance.balance} />
                </motion.div>
              )}
              {!creditsLoading && balance && balance.balance <= 0 && (
                <motion.div variants={staggerItem} initial="hidden" animate="visible" className="mb-6">
                  <CreditEmptyPrompt transactions={transactions} />
                </motion.div>
              )}

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentTab}
                  custom={direction}
                  variants={sectionPanel}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {currentTab === "profile" && (
                    <ProfileTab
                      userId={user!.id}
                      displayName={displayName}
                      setDisplayName={setDisplayName}
                      email={user?.email || ""}
                      bio={bio}
                      setBio={setBio}
                      avatarUrl={avatarUrl}
                      setAvatarUrl={setAvatarUrl}
                      createdAt={profile?.created_at}
                    />
                  )}

                  {currentTab === "activity" && user && <ActivityTab userId={user.id} />}

                  {currentTab === "notifications" && (
            <motion.div variants={staggerItem} initial="hidden" animate="visible">
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" /> Notification Preferences
                  </CardTitle>
                  <CardDescription>Control how and when you receive alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <NotificationsExtras
                    notificationEmail={notificationEmail}
                    onNotificationEmailChange={(v) => {
                      setNotificationEmail(v);
                      scheduleNotificationSave();
                    }}
                    notificationPush={notificationPush}
                    onNotificationPushChange={(v) => {
                      setNotificationPush(v);
                      scheduleNotificationSave();
                    }}
                    notificationMentions={notificationMentions}
                    onNotificationMentionsChange={(v) => {
                      setNotificationMentions(v);
                      scheduleNotificationSave();
                    }}
                    extended={extendedNotif}
                    onExtendedChange={handleExtendedNotifChange}
                  />
                  <p className="text-xs text-muted-foreground pt-3 border-t border-border/40 mt-2">
                    Changes save automatically. Profile fields still use the Save button in the header.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
                  )}

                  {currentTab === "security" && (
            <motion.div className="space-y-6">
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>Protect your account with TOTP-based 2FA</CardDescription>
                </CardHeader>
                <CardContent>
                  <TwoFactorSetup />
                </CardContent>
              </Card>

              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" /> Active sessions
                  </CardTitle>
                  <CardDescription>Review and revoke signed-in devices</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" onClick={() => navigate("/sessions")}>
                    Manage sessions
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>





              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" /> Password
                  </CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-5 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <KeyRound className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Account Password</p>
                        <p className="text-xs text-muted-foreground">Use a strong, unique password</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-destructive/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" /> Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-5 rounded-xl bg-destructive/5 border border-destructive/20">
                    <div>
                      <p className="font-medium text-sm text-destructive">Delete Account</p>
                      <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
                  )}



                  {currentTab === "ai" && <AiSettingsTab />}

                  {currentTab === "preferences" && <PreferencesTab />}

                  {currentTab === "billing" && (
            <motion.div className="space-y-6">
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Billing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent border border-primary/15">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-lg">Free access</p>
                        <p className="text-2xl font-bold gradient-text">$0</p>
                      </div>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> All features included
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      ShadowTalk AI is free to use. Bring your own AI provider API
                      key and choose your preferred models. Your provider may
                      charge separately for API usage.
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <Button onClick={() => navigate("/settings")} variant="outline" className="w-full">
                        Manage your AI provider keys
                      </Button>
                      <Button onClick={() => navigate("/pricing")} variant="ghost" className="w-full">
                        How free access works
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!creditsLoading && transactions.length > 0 && (
                <UsageHistoryTable transactions={transactions} />
              )}

              <ReferralProgram />
            </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-border/30 bg-background/85 backdrop-blur-2xl py-2.5 pointer-events-none">
        <p className="text-center text-[11px] text-muted-foreground tracking-wide">
          <kbd className="font-mono px-1.5 py-0.5 rounded border border-border/50 bg-muted/30">↑↓</kbd>{" "}
          browse tabs ·{" "}
          <kbd className="font-mono px-1.5 py-0.5 rounded border border-border/50 bg-muted/30">1–8</kbd>{" "}
          jump
        </p>
      </footer>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-sm glass-strong border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Change Password
            </DialogTitle>
            <DialogDescription>Enter a new password for your account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="bg-muted/30 pr-10"
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowNewPw(!showNewPw)}>
                  {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="bg-muted/30" />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Passwords do not match
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword || newPassword.length < 8 || newPassword !== confirmPassword}>
              {isChangingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm glass-strong border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Account
            </DialogTitle>
              <DialogDescription>
               This permanently deletes your Firebase account records and private receipt files. Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder='Type "DELETE"' className="bg-muted/30 font-mono" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || isDeletingAccount}
              onClick={() => void handleDeleteAccount()}
            >
              {isDeletingAccount ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
