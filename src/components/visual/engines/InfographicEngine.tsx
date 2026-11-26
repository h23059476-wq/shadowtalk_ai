/**
 * InfographicEngine — Mode C: structured Bento grid.
 *
 * Replaces the retired raw-SVG illustration generator: the LLM supplies
 * structured card JSON (icon name, title, metric, description, named accent,
 * tags) and this engine renders it as a modern, glassmorphic bento layout
 * with crisp lucide vector icons. Zero network, zero hand-drawn geometry.
 */

import React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BatteryCharging,
  BookOpen,
  Bot,
  Brain,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Cloud,
  Code2,
  Compass,
  Cpu,
  CreditCard,
  Database,
  DollarSign,
  Download,
  Eye,
  Factory,
  FileText,
  Flag,
  Gauge,
  GitBranch,
  Globe,
  Hammer,
  Heart,
  Info,
  KeyRound,
  Layers,
  Leaf,
  Lightbulb,
  LineChart,
  Lock,
  Mail,
  Map,
  MessageCircle,
  Mic,
  Monitor,
  Package,
  PieChart,
  Play,
  Plug,
  Recycle,
  RefreshCw,
  Rocket,
  Scale,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Terminal,
  TrendingDown,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Wallet,
  WifiOff,
  Wrench,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ACCENT_TOKENS, type VisualAccent } from "../visualTheme";
import { normalizeIconName, type ShadowInfographicVisual, type ShadowInfoCard } from "../visualContract";

/** Fixed lucide registry — unknown names fall back to Sparkles. */
const ICON_REGISTRY: Record<string, LucideIcon> = {
  activity: Activity, "alert-triangle": AlertTriangle, "bar-chart-3": BarChart3,
  "battery-charging": BatteryCharging, "book-open": BookOpen, bot: Bot,
  brain: Brain, "building-2": Building2, calendar: Calendar, camera: Camera,
  "check-circle-2": CheckCircle2, clock: Clock, cloud: Cloud, "code-2": Code2,
  compass: Compass, cpu: Cpu, "credit-card": CreditCard, database: Database,
  "dollar-sign": DollarSign, download: Download, eye: Eye, factory: Factory,
  "file-text": FileText, flag: Flag, gauge: Gauge, "git-branch": GitBranch,
  globe: Globe, hammer: Hammer, heart: Heart, info: Info, "key-round": KeyRound,
  layers: Layers, leaf: Leaf, lightbulb: Lightbulb, "line-chart": LineChart,
  lock: Lock, mail: Mail, map: Map, "message-circle": MessageCircle, mic: Mic,
  monitor: Monitor, package: Package, "pie-chart": PieChart, play: Play,
  plug: Plug, recycle: Recycle, "refresh-cw": RefreshCw, rocket: Rocket,
  scale: Scale, search: Search, send: Send, server: Server, settings: Settings,
  shield: Shield, "shield-check": ShieldCheck, smartphone: Smartphone,
  sparkles: Sparkles, star: Star, target: Target, terminal: Terminal,
  "trending-down": TrendingDown, "trending-up": TrendingUp, upload: Upload,
  "user-check": UserCheck, users: Users, wallet: Wallet, "wifi-off": WifiOff,
  wrench: Wrench, "x-circle": XCircle, zap: Zap,
};

export function resolveIcon(name: string | undefined): LucideIcon {
  if (!name) return Sparkles;
  const normalized = normalizeIconName(name);
  return ICON_REGISTRY[normalized] ?? Sparkles;
}

const CARD_GRID_CLASS: Record<ShadowInfographicVisual["layout"], string> = {
  "grid-2": "grid grid-cols-1 sm:grid-cols-2 gap-3",
  "grid-3": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
  timeline: "flex flex-col gap-0",
  comparison: "grid grid-cols-1 sm:grid-cols-2 gap-3",
};

const BentoCard: React.FC<{ card: ShadowInfoCard; index: number; layout: ShadowInfographicVisual["layout"] }> = ({
  card,
  index,
  layout,
}) => {
  const accent: VisualAccent = card.accent ?? (["indigo", "emerald", "cyan", "amber", "rose"] as VisualAccent[])[index % 5];
  const tokens = ACCENT_TOKENS[accent];
  const Icon = resolveIcon(card.iconName);

  if (layout === "timeline") {
    return (
      <div className="relative flex gap-4 pb-4 last:pb-0">
        {/* Rail */}
        <div className="flex flex-col items-center">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
            style={{ borderColor: tokens.glow, background: tokens.soft, boxShadow: `0 0 ${18}px ${tokens.glow}` }}
          >
            <Icon className="h-4 w-4" style={{ color: tokens.hex }} />
          </span>
          <span className="mt-1 w-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>
        {/* Body */}
        <div className="min-w-0 flex-1 pb-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h4 className="text-sm font-semibold text-white/92">{card.title}</h4>
            {card.metric && (
              <span className="text-sm font-bold tabular-nums" style={{ color: tokens.hex }}>
                {card.metric}
                {card.metricLabel ? <span className="ml-1 text-[10px] font-medium text-white/45">{card.metricLabel}</span> : null}
              </span>
            )}
          </div>
          {card.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-white/55">{card.description}</p>
          )}
          {card.tags && card.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-white/60"
                  style={{ borderColor: tokens.soft, background: tokens.soft }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border p-4 transition-colors duration-300"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
    >
      {/* Radial glow accent */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
        style={{ background: tokens.glow }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{ borderColor: tokens.glow, background: tokens.soft }}
        >
          <Icon className="h-4 w-4" style={{ color: tokens.hex }} />
        </span>
        {card.metric && (
          <span className="text-right">
            <span className="block text-lg font-bold leading-tight tabular-nums" style={{ color: tokens.hex }}>
              {card.metric}
            </span>
            {card.metricLabel && <span className="block text-[10px] font-medium text-white/45">{card.metricLabel}</span>}
          </span>
        )}
      </div>
      <h4 className="relative mt-3 text-sm font-semibold leading-snug text-white/92">{card.title}</h4>
      {card.description && (
        <p className="relative mt-1.5 text-[12.5px] leading-relaxed text-white/55">{card.description}</p>
      )}
      {card.tags && card.tags.length > 0 && (
        <div className="relative mt-2.5 flex flex-wrap gap-1.5">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-white/60"
              style={{ borderColor: tokens.soft, background: tokens.soft }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export interface InfographicEngineProps {
  visual: ShadowInfographicVisual;
}

/** The bento surface — the studio frame lives in ShadowVisualRenderer. */
const InfographicEngine: React.FC<InfographicEngineProps> = ({ visual }) => {
  return (
    <div data-testid="shadow-infographic-engine">
      {visual.badge && (
        <span
          className="mb-3 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70"
          style={{ borderColor: "rgba(99,102,241,0.35)", background: "rgba(99,102,241,0.10)" }}
        >
          {visual.badge}
        </span>
      )}
      <div className={CARD_GRID_CLASS[visual.layout] ?? CARD_GRID_CLASS["grid-3"]}>
        {visual.cards.map((card, i) => (
          <BentoCard key={`${card.title}-${i}`} card={card} index={i} layout={visual.layout} />
        ))}
      </div>
    </div>
  );
};

export default InfographicEngine;
