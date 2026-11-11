import { useState, useEffect } from "react";
import {
  Gift, Copy, Check, Users, DollarSign, TrendingUp,
  Share2, Trophy, Target, Zap, Crown, ExternalLink, Mail, Instagram, Linkedin,
} from "lucide-react";
import { FOUNDER_SOCIAL } from "@/lib/socialLinks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { backend } from "@/integrations/local/client";
import { useAuth } from "@/components/AuthProvider";
import { motion } from "framer-motion";
import {
  getTier, getNextTier, getShareLinks, MILESTONES, POWER_USER_TIERS,
} from "@/hooks/useReferralTracking";
import ReferralEthicsNotice from "@/components/growth/ReferralEthicsNotice";

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  successful_conversions: number;
  total_earnings: number;
}

interface Referral {
  id: string;
  referred_email_masked: string | null;
  status: string;
  commission_amount: number;
  created_at: string;
  converted_at: string | null;
}


const ReferralProgram = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;
    try {
      let { data: codeData, error: codeError } = await backend
        .from("user_referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!codeData && !codeError) {
        const newCode = `ST${user.id.slice(0, 8).toUpperCase()}`;
        const { data: newCodeData } = await backend
          .from("user_referral_codes")
          .insert({ user_id: user.id, referral_code: newCode })
          .select()
          .single();
        codeData = newCodeData;
      }

      if (codeData) {
        setStats({
          referral_code: codeData.referral_code,
          total_referrals: codeData.total_referrals || 0,
          successful_conversions: codeData.successful_conversions || 0,
          total_earnings: Number(codeData.total_earnings) || 0,
        });
      }

      const { data: referralData } = await backend
        .from("referrals")
        .select("id, referred_email_masked, status, commission_amount, created_at, converted_at")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });


      if (referralData) setReferrals(referralData as Referral[]);
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!stats?.referral_code) return;
    const link = `${window.location.origin}?ref=${stats.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTier = stats ? getTier(stats.total_referrals) : null;
  const nextTier = stats ? getNextTier(stats.total_referrals) : POWER_USER_TIERS[0];
  const shareLinks = stats
    ? getShareLinks(stats.referral_code, window.location.origin)
    : null;

  const progressToNext = nextTier && stats
    ? Math.min(100, (stats.total_referrals / nextTier.minReferrals) * 100)
    : 100;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-muted text-muted-foreground",
      signed_up: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      subscribed: "bg-green-500/20 text-green-400 border-green-500/30",
      paid_out: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    return (
      <Badge className={variants[status] || "bg-muted text-muted-foreground"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ReferralEthicsNotice />
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/10 border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Gift className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Viral Referral Engine</CardTitle>
                  <p className="text-muted-foreground">
                    Earn up to <span className="text-primary font-bold">40% commission</span> — level up with every referral
                  </p>
                </div>
              </div>
              {currentTier && (
                <Badge className="text-lg px-3 py-1 bg-primary/20 border-primary/30">
                  {currentTier.badge} {currentTier.name}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Share Link */}
            <div>
              <label className="text-sm font-medium mb-2 block">Your Referral Link</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareLinks?.link || "Loading..."}
                  className="bg-background/50 font-mono text-sm"
                />
                <Button onClick={copyReferralLink} variant="outline" size="icon">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Social Share Buttons */}
            {shareLinks && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(FOUNDER_SOCIAL.instagram.url, "_blank")}
                >
                  <Instagram className="h-3.5 w-3.5" /> Follow on Instagram
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(shareLinks.whatsapp, "_blank")}
                >
                  <Share2 className="h-3.5 w-3.5" /> WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(FOUNDER_SOCIAL.linkedin.url, "_blank")}
                >
                  <Linkedin className="h-3.5 w-3.5" /> Follow on LinkedIn
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(shareLinks.linkedin, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Share on LinkedIn
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(shareLinks.email, "_blank")}
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Referrals", value: stats?.total_referrals || 0, color: "text-blue-400", bg: "bg-blue-500/20" },
          { icon: TrendingUp, label: "Conversions", value: stats?.successful_conversions || 0, color: "text-green-400", bg: "bg-green-500/20" },
          { icon: DollarSign, label: "Earnings", value: `$${(stats?.total_earnings || 0).toFixed(2)}`, color: "text-amber-400", bg: "bg-amber-500/20" },
          { icon: Zap, label: "Commission", value: `${currentTier?.commission || 20}%`, color: "text-primary", bg: "bg-primary/20" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tier Progress */}
      {nextTier && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Next Level: {nextTier.badge} {nextTier.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {stats?.total_referrals || 0} / {nextTier.minReferrals} referrals
              </span>
              <span className="text-primary font-medium">
                Unlocks {nextTier.commission}% commission
              </span>
            </div>
            <Progress value={progressToNext} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {nextTier.minReferrals - (stats?.total_referrals || 0)} more referrals to unlock +{nextTier.bonus} bonus credits
            </p>
          </CardContent>
        </Card>
      )}

      {/* Power Tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Power User Tiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {POWER_USER_TIERS.map((tier) => {
              const isActive = currentTier?.name === tier.name;
              const isLocked = (stats?.total_referrals || 0) < tier.minReferrals;
              return (
                <div
                  key={tier.name}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : isLocked
                      ? "border-border/50 opacity-50"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <span className="text-2xl block mb-1">{tier.badge}</span>
                  <p className="font-semibold text-sm">{tier.name}</p>
                  <p className="text-primary text-lg font-bold">{tier.commission}%</p>
                  <p className="text-xs text-muted-foreground">{tier.minReferrals}+ referrals</p>
                  {isActive && (
                    <Badge className="mt-2 bg-primary/20 text-primary text-xs">Current</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Milestones & Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MILESTONES.map((milestone) => {
              const reached = (stats?.total_referrals || 0) >= milestone.count;
              return (
                <div
                  key={milestone.count}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    reached ? "bg-primary/10 border border-primary/20" : "bg-muted/30 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{reached ? milestone.icon : "🔒"}</span>
                    <div>
                      <p className={`font-medium text-sm ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                        {milestone.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{milestone.count} referrals</p>
                    </div>
                  </div>
                  <Badge variant={reached ? "default" : "outline"} className="text-xs">
                    {milestone.reward}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Share Your Link", desc: "Share on social media, email, or direct message" },
              { step: "2", title: "They Sign Up", desc: "Your friend creates a free ShadowTalk account" },
              { step: "3", title: "They Start Building", desc: "They explore the full free workspace" },
              { step: "4", title: "You Both Win", desc: "Your friend ships faster with you in their corner" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">{s.step}</span>
                </div>
                <h4 className="font-medium mb-1 text-sm">{s.title}</h4>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Referral History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{referral.referred_email_masked ?? "Referred user"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {referral.commission_amount > 0 && (
                      <span className="text-sm font-medium text-green-400">
                        +${referral.commission_amount.toFixed(2)}
                      </span>
                    )}
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReferralProgram;
