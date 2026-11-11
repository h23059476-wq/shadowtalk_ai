import type { SettingsSectionId } from "@/lib/settingsTypes";

export interface SettingsCatalogEntry {
  id: string;
  section: SettingsSectionId;
  label: string;
  description: string;
  keywords: string[];
}

export const SETTINGS_CATALOG: SettingsCatalogEntry[] = [
  { id: "theme", section: "general", label: "Theme", description: "ShadowTalk dark appearance", keywords: ["dark", "appearance", "color"] },
  { id: "language", section: "general", label: "Language", description: "Display language", keywords: ["locale", "translate", "english"] },
  { id: "sound", section: "general", label: "Sound effects", description: "UI feedback sounds", keywords: ["audio", "volume"] },
  { id: "compact", section: "general", label: "Compact mode", description: "Tighter UI spacing", keywords: ["density", "layout"] },
  { id: "instructions", section: "personalization", label: "Custom instructions", description: "Default system prompt style", keywords: ["prompt", "persona", "tone"] },
  { id: "default-model", section: "personalization", label: "Default model", description: "AI provider for new chats", keywords: ["gemini", "gpt", "claude", "provider"] },
  { id: "personality", section: "personalization", label: "Default personality", description: "Assistant tone", keywords: ["friendly", "professional", "witty"] },
  { id: "enter-send", section: "chat", label: "Enter to send", description: "Keyboard send behavior", keywords: ["keyboard", "shift"] },
  { id: "timestamps", section: "chat", label: "Message timestamps", description: "Show time on messages", keywords: ["time", "clock"] },
  { id: "offline", section: "models", label: "Offline AI", description: "On-device models", keywords: ["local", "webgpu", "privacy"] },
  { id: "sovereign", section: "models", label: "ShadowTalk model", description: "Sovereign on-device learning", keywords: ["training", "weights"] },
  { id: "desktop", section: "models", label: "Desktop app", description: "Install native client", keywords: ["electron", "capacitor"] },
  { id: "learning", section: "data", label: "Adaptive learning", description: "On-device behavior learning", keywords: ["auto improve", "consent"] },
  { id: "privacy", section: "data", label: "Privacy & data", description: "Export and clear local data", keywords: ["gdpr", "delete", "cookies"] },
  { id: "api-keys", section: "connections", label: "API keys", description: "Bring your own provider keys", keywords: ["byok", "openai", "anthropic"] },
  { id: "linked", section: "connections", label: "Linked accounts", description: "Google, GitHub, Slack, WhatsApp QR", keywords: ["oauth", "integration", "whatsapp", "qr"] },
  { id: "profile", section: "account", label: "Profile & avatar", description: "Name, bio, photo", keywords: ["user", "photo"] },
  { id: "billing", section: "account", label: "Billing", description: "Everything is free — no subscription", keywords: ["free", "byok", "api key"] },
  { id: "security", section: "account", label: "Security & 2FA", description: "Password and vault", keywords: ["2fa", "password"] },
];

export function filterSettingsCatalog(query: string): SettingsCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SETTINGS_CATALOG.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.keywords.some((k) => k.includes(q) || q.includes(k)),
  ).slice(0, 8);
}
