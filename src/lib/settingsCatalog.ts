import type { SettingsSectionId } from "@/lib/settingsTypes";

export interface SettingsCatalogEntry {
  id: string;
  section: SettingsSectionId;
  label: string;
  description: string;
  keywords: string[];
}

export const SETTINGS_CATALOG: SettingsCatalogEntry[] = [
  { id: "offline", section: "offline", label: "Offline AI", description: "On-device models", keywords: ["local", "webgpu", "privacy"] },
  { id: "sovereign", section: "models", label: "ShadowTalk model", description: "Sovereign on-device learning", keywords: ["training", "weights"] },
  { id: "desktop", section: "models", label: "Desktop app", description: "Install native client", keywords: ["electron", "capacitor"] },
  { id: "learning", section: "data", label: "Adaptive learning", description: "On-device behavior learning", keywords: ["auto improve", "consent"] },
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
