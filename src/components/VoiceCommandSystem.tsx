import React from "react";

// All navigable pages with aliases for voice matching (retained for route audit and navigational indexing)
export const VOICE_ROUTES = [
  { path: "/chatbot", names: ["chatbot", "chat", "chat bot", "ai chat", "talk"] },
  { path: "/home", names: ["home", "landing", "main page", "homepage", "marketing"] },
  { path: "/pricing", names: ["pricing", "plans", "prices", "subscription"] },
  { path: "/strategy", names: ["strategy", "strategy agent", "business strategy"] },
  { path: "/workspace", names: ["workspace", "ai workspace", "work space"] },
  { path: "/ide", names: ["ide", "code ide", "code editor", "open ide"] },
  { path: "/marketplace", names: ["marketplace", "market place", "store", "agents"] },
  { path: "/missioncontrol", names: ["mission control", "missions", "mission"] },
  { path: "/forge", names: ["content forge", "presentations", "slides", "presentation builder", "documents", "beast mode"] },
  { path: "/developers", names: ["developers", "developer tools", "dev tools"] },
  { path: "/privacy-score", names: ["privacy score", "privacy", "privacy check"] },
  { path: "/docs", names: ["docs", "documentation", "documents"] },
  { path: "/changelog", names: ["changelog", "change log", "what's new", "updates"] },
  { path: "/rooms", names: ["rooms", "chat rooms", "collaborative rooms"] },
  { path: "/api", names: ["api", "api reference", "api docs"] },
  { path: "/analytics", names: ["analytics", "dashboard", "stats", "statistics"] },
  { path: "/enterprise", names: ["enterprise", "enterprise settings"] },
  { path: "/about", names: ["about", "about us", "about page"] },
  { path: "/shadow-memory", names: ["shadow memory", "memory", "activity log", "activity"] },
  { path: "/admin", names: ["admin", "admin panel", "administration"] },
  { path: "/profile", names: ["profile", "my profile", "account"] },
  { path: "/settings", names: ["settings", "preferences", "configuration"] },
  { path: "/billing", names: ["billing", "payments", "monetization"] },
  { path: "/founder-access", names: ["founder", "founder access", "founders"] },
  { path: "/research", names: ["research", "deep research", "deep search"] },
  { path: "/knowledge", names: ["knowledge", "knowledge graph", "knowledge base"] },
  { path: "/strategy-lab", names: ["strategy lab", "lab", "experiments"] },
  { path: "/sovereign-data", names: ["sovereign data", "data sovereignty", "sovereign"] },
  { path: "/vault", names: ["vault", "stealth vault", "encrypted vault", "secret vault"] },
  { path: "/business-memory", names: ["business memory", "business context"] },
  { path: "/wallet", names: ["wallet", "sovereign wallet", "credits"] },
  { path: "/ghost-ads", names: ["ghost ads", "ads", "advertising"] },
  { path: "/data-insights", names: ["data insights", "insights"] },
  { path: "/security-audit", names: ["security audit", "security", "audit"] },
  { path: "/command-center", names: ["command center", "automation", "commands"] },
  { path: "/help", names: ["help", "help center", "support"] },
  { path: "/faq", names: ["faq", "questions", "frequently asked"] },
  { path: "/contact", names: ["contact", "contact us", "reach out"] },
  { path: "/status", names: ["status", "system status", "uptime"] },
  { path: "/blog", names: ["blog", "articles", "posts"] },
  { path: "/referral", names: ["referral", "referrals", "refer a friend"] },
  { path: "/auth", names: ["login", "sign in", "sign up", "register", "authentication"] },
  { path: "/templates", names: ["templates", "ui templates", "theme", "themes", "custom theme", "theme designer"] },
  { path: "/competitive", names: ["competitive", "comparison", "versus", "vs kimi", "vs campus"] },
  { path: "/agents", names: ["agents", "agent architecture", "distributed agents", "spawn agents"] },
  { path: "/compliance", names: ["compliance", "compliance dashboard", "gdpr", "privacy compliance"] },
];

/**
 * VoiceCommandSystem floating mic component is completely disabled per design specifications.
 */
const VoiceCommandSystem: React.FC = () => {
  return null;
};

export default VoiceCommandSystem;
