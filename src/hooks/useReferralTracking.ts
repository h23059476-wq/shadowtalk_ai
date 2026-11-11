import { useEffect } from "react";
import { recordGrowthEvent } from "@/lib/shadowScale/growthEvents";

const REFERRAL_STORAGE_KEY = "shadowtalk_ref_code";
const REFERRAL_CLICK_KEY = "shadowtalk_ref_click_logged";

export const POWER_USER_TIERS = [
  { name: "Bronze", minReferrals: 3, commission: 20, badge: "🥉", bonus: 5 },
  { name: "Silver", minReferrals: 10, commission: 25, badge: "🥈", bonus: 15 },
  { name: "Gold", minReferrals: 25, commission: 30, badge: "🥇", bonus: 30 },
  { name: "Platinum", minReferrals: 50, commission: 40, badge: "💎", bonus: 50 },
] as const;

export type PowerTier = typeof POWER_USER_TIERS[number];

export const getTier = (referrals: number): PowerTier | null => {
  for (let i = POWER_USER_TIERS.length - 1; i >= 0; i--) {
    if (referrals >= POWER_USER_TIERS[i].minReferrals) {
      return POWER_USER_TIERS[i];
    }
  }
  return null;
};

export const getNextTier = (referrals: number): PowerTier | null => {
  for (const tier of POWER_USER_TIERS) {
    if (referrals < tier.minReferrals) return tier;
  }
  return null;
};

export const getShareLinks = (code: string, baseUrl: string) => {
  const link = `${baseUrl}?ref=${code}`;
  const text = encodeURIComponent(
    "I've been using ShadowTalk AI — an intelligent multi-model agentic workspace with built-in tools. Try it free:"
  );
  return {
    link,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(link)}`,
    whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(link)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    email: `mailto:?subject=${encodeURIComponent("Try ShadowTalk AI")}&body=${text}%20${encodeURIComponent(link)}`,
  };
};

/** Captures ?ref= from URL on app load and stores in localStorage */
export const useReferralCapture = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
      const clickKey = `${REFERRAL_CLICK_KEY}:${refCode}`;
      if (!sessionStorage.getItem(clickKey)) {
        sessionStorage.setItem(clickKey, "1");
        recordGrowthEvent("referral_click", refCode);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);
};

export const getStoredReferralCode = (): string | null => {
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
};

export const clearStoredReferralCode = () => {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
};

export const MILESTONES = [
  { count: 1, label: "First Referral", reward: "🎉 +5 bonus credits", icon: "🚀" },
  { count: 5, label: "Rising Star", reward: "🎁 +20 bonus credits", icon: "⭐" },
  { count: 10, label: "Silver Status", reward: "🥈 25% commission unlock", icon: "🥈" },
  { count: 25, label: "Gold Status", reward: "🥇 30% commission + priority support", icon: "🥇" },
  { count: 50, label: "Platinum Legend", reward: "💎 40% commission + white-label access", icon: "💎" },
  { count: 100, label: "Shadow Elite", reward: "👑 Custom partnership deal", icon: "👑" },
] as const;
