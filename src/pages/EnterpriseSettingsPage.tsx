import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { backend } from "@/integrations/local/client";
import { SSOProvider } from "@/components/enterprise/SSOProvider";
import { WhiteLabelBranding } from "@/components/chat/WhiteLabelBranding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Shield, Users, Building2, Lock, CheckCircle2,
  AlertCircle, Zap, Palette
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const EnterpriseSettingsPage = () => {
  const navigate = useNavigate();
  const { user, userPlan } = useAuth();
  const { toast } = useToast();
  
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [showBranding, setShowBranding] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; role: string; user_id: string; display_name: string | null }>>([]);
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; role: string; expires_at: string }>>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [teamLoading, setTeamLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState("60");
  
  // FREE ACCESS TRANSITION: enterprise workspace features are included free.
  const hasEnterpriseAccess = true;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadWorkspace = async () => {
      const { data: existing } = await backend
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (existing?.id) {
        setWorkspaceId(existing.id);
        return;
      }

      const slug = `workspace-${user.id.slice(0, 8)}`;
      const { data: created } = await backend
        .from("workspaces")
        .insert({ owner_id: user.id, name: "My Workspace", slug })
        .select("id")
        .single();

      if (!cancelled && created?.id) setWorkspaceId(created.id);
    };

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    const loadTeam = async () => {
      setTeamLoading(true);
      try {
        const [{ data: members }, { data: invites }] = await Promise.all([
          backend
            .from("workspace_members")
            .select("id, role, user_id, profiles(display_name)")
            .eq("workspace_id", workspaceId),
          backend
            .from("workspace_invitations")
            .select("id, email, role, expires_at")
            .eq("workspace_id", workspaceId)
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString()),
        ]);

        if (cancelled) return;
        setTeamMembers(
          (members ?? []).map((m) => ({
            id: m.id,
            role: m.role,
            user_id: m.user_id,
            display_name: (m.profiles as unknown as { display_name: string | null } | null)?.display_name ?? null,
          })),
        );
        setPendingInvites(invites ?? []);
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    };

    void loadTeam();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const handleInviteMember = async () => {
    if (!user || !workspaceId || !inviteEmail.trim()) return;
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await backend.from("workspace_invitations").insert({
        workspace_id: workspaceId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: user.id,
        token,
        expires_at: expiresAt,
      });
      if (error) throw error;
      toast({ title: "Invitation sent", description: `${inviteEmail} can join your workspace.` });
      setInviteEmail("");
      const { data: invites } = await backend
        .from("workspace_invitations")
        .select("id, email, role, expires_at")
        .eq("workspace_id", workspaceId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString());
      setPendingInvites(invites ?? []);
    } catch (error) {
      toast({
        title: "Invite failed",
        description: error instanceof Error ? error.message : "Could not send invitation",
        variant: "destructive",
      });
    }
  };

  const handleSaveSecurity = () => {
    try {
      localStorage.setItem(
        "shadowtalk_enterprise_security",
        JSON.stringify({ mfaRequired, sessionTimeout, ipWhitelist }),
      );
    } catch {
      /* ignore */
    }
    toast({ title: "Security settings saved", description: "Policies stored for this workspace session." });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="card-glass max-w-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <CardContent className="pt-6 text-center relative z-10">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please sign in to access Enterprise Settings.</p>
            <Button className="btn-glow" onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[180px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[150px]" />
      </div>

      <main className="container mx-auto px-4 py-8 pt-24 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                <Building2 className="h-8 w-8 text-primary" />
                Enterprise <span className="gradient-text">Settings</span>
              </h1>
              <p className="text-muted-foreground">Configure SSO, security, and workspace settings</p>
            </div>
            {hasEnterpriseAccess && (
              <Badge className="ml-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0">
                {userPlan === 'enterprise' ? 'Enterprise Plan' : 'Elite Plan'}
              </Badge>
            )}
          </motion.div>

          {!hasEnterpriseAccess && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="mb-8 card-glass border-warning/30 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-warning/50 to-transparent" />
                <CardContent className="pt-6 flex items-start gap-4 relative z-10">
                  <AlertCircle className="h-6 w-6 text-warning shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Enterprise Features Require Elite Plan</h3>
                    <p className="text-sm text-muted-foreground mb-3">SSO, advanced security, and workspace management are available on the Elite plan.</p>
                    <Button onClick={() => navigate('/pricing')} size="sm" className="btn-glow">
                      <Zap className="h-4 w-4 mr-2" />Upgrade to Elite
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Tabs defaultValue="sso" className="space-y-6">
            <TabsList className="glass-subtle border-border/30">
              <TabsTrigger value="sso" className="gap-2"><Shield className="h-4 w-4" />SSO</TabsTrigger>
              <TabsTrigger value="security" className="gap-2"><Lock className="h-4 w-4" />Security</TabsTrigger>
              <TabsTrigger value="branding" className="gap-2"><Palette className="h-4 w-4" />Branding</TabsTrigger>
              <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" />Team</TabsTrigger>
            </TabsList>

            <TabsContent value="sso" className="space-y-6">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                {workspaceId ? (
                  <SSOProvider workspaceId={workspaceId} />
                ) : (
                  <Card className="card-glass overflow-hidden">
                    <CardContent className="py-10 text-center text-muted-foreground">
                      Loading workspace…
                    </CardContent>
                  </Card>
                )}
              </motion.div>

              <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="card-glass overflow-hidden">
                  <CardHeader className="relative z-10"><CardTitle>Service Provider Details</CardTitle><CardDescription>Use these values to configure your identity provider</CardDescription></CardHeader>
                  <CardContent className="relative z-10">
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        { label: "ACS URL", value: "https://shadowtalk-ai.com/auth/saml/callback" },
                        { label: "Entity ID", value: "https://shadowtalk-ai.com/saml/metadata" },
                        { label: "OAuth Callback URL", value: "https://shadowtalk-ai.com/auth/callback" },
                        { label: "Name ID Format", value: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" },
                      ].map((item, i) => (
                        <div key={i} className="glass-subtle rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                          <code className="text-sm break-all text-primary">{item.value}</code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="card-glass overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Security Policies</CardTitle>
                    <CardDescription>Configure security requirements for your workspace</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between p-4 glass-subtle rounded-xl">
                      <div>
                        <h4 className="font-medium">Require Multi-Factor Authentication</h4>
                        <p className="text-sm text-muted-foreground">All users must enable MFA to access the workspace</p>
                      </div>
                      <Switch checked={mfaRequired} onCheckedChange={setMfaRequired} disabled={!hasEnterpriseAccess} />
                    </div>
                    <div className="space-y-3">
                      <Label>Session Timeout (minutes)</Label>
                      <Select value={sessionTimeout} onValueChange={setSessionTimeout} disabled={!hasEnterpriseAccess}>
                        <SelectTrigger className="max-w-xs bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="480">8 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label>IP Whitelist</Label>
                      <textarea className="w-full h-24 p-3 bg-background/50 border border-border/50 rounded-xl text-sm font-mono" placeholder={"Enter IP addresses or CIDR ranges, one per line\ne.g., 192.168.1.0/24"} value={ipWhitelist} onChange={e => setIpWhitelist(e.target.value)} disabled={!hasEnterpriseAccess} />
                    </div>
                    <Button className="btn-glow" disabled={!hasEnterpriseAccess} onClick={handleSaveSecurity}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Security Settings
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="branding" className="space-y-6">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="card-glass overflow-hidden">
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      White-Label Branding
                    </CardTitle>
                    <CardDescription>
                      Customize logos, colors, and domain for your workspace chat experience.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Open the branding studio to preview and save your organization&apos;s look. Changes sync to your workspace when you have Elite or Enterprise access.
                    </p>
                    <Button
                      className="btn-glow"
                      disabled={!hasEnterpriseAccess}
                      onClick={() => setShowBranding(true)}
                    >
                      <Palette className="h-4 w-4 mr-2" />
                      Open Branding Studio
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="card-glass overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Team Management</CardTitle>
                    <CardDescription>Manage your workspace team members</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-6">
                    {teamLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Loading team…</p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Members ({teamMembers.length})</Label>
                          <div className="space-y-2">
                            {teamMembers.map((member) => (
                              <div key={member.id} className="flex items-center justify-between glass-subtle rounded-xl px-4 py-3">
                                <div>
                                  <p className="font-medium text-sm">
                                    {member.display_name || `User ${member.user_id.slice(0, 8)}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{member.user_id}</p>
                                </div>
                                <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                              </div>
                            ))}
                            {teamMembers.length === 0 && (
                              <p className="text-sm text-muted-foreground">No members yet.</p>
                            )}
                          </div>
                        </div>

                        {pendingInvites.length > 0 && (
                          <div className="space-y-2">
                            <Label>Pending invites</Label>
                            {pendingInvites.map((invite) => (
                              <div key={invite.id} className="flex items-center justify-between glass-subtle rounded-xl px-4 py-3 text-sm">
                                <span>{invite.email}</span>
                                <Badge variant="outline" className="capitalize">{invite.role}</Badge>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-3 border-t border-border/30 pt-4">
                          <Label>Invite teammate</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              type="email"
                              placeholder="colleague@company.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              disabled={!hasEnterpriseAccess}
                              className="bg-background/50"
                            />
                            <Select value={inviteRole} onValueChange={setInviteRole} disabled={!hasEnterpriseAccess}>
                              <SelectTrigger className="sm:w-36 bg-background/50"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button className="btn-glow" disabled={!hasEnterpriseAccess} onClick={() => void handleInviteMember()}>
                              Invite
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
      {showBranding && (
        <WhiteLabelBranding
          workspaceId={workspaceId ?? undefined}
          onClose={() => setShowBranding(false)}
        />
      )}
    </div>
  );
};

export default EnterpriseSettingsPage;