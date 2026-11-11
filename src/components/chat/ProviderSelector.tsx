import { Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { isTurboAvailable } from '@/lib/turbo';

export type { AIProvider } from '@/lib/aiProviders';
import type { AIProvider } from '@/lib/aiProviders';

interface ProviderSelectorProps {
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  hasKeyForProvider?: (provider: AIProvider) => boolean;
  disabled?: boolean;
  variant?: 'header' | 'inline' | 'chip';
}

const PROVIDERS = [
  {
    id: 'turbo' as const,
    label: 'ShadowTalk Turbo',
    sub: 'Groq Llama 3.3 70B ~ 300ms TTFT',
    icon: Zap,
    iconColor: 'text-amber-400',
    requiresKey: true,
  },
  {
    id: 'shadowtalk' as const,
    label: 'ShadowTalk Pro',
    sub: 'Platform cloud AI (Gemini)',
    icon: Sparkles,
    iconColor: 'text-violet-400',
    requiresKey: false,
  },
];

export const ProviderSelector = ({
  provider,
  onProviderChange,
  disabled,
  variant = 'header',
}: ProviderSelectorProps) => {
  const turboReady = isTurboAvailable();
  const active = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];

  const ActiveIcon = active.icon;
  const isActiveTurbo = provider === 'turbo';
  const isActiveShadowTalk = provider === 'shadowtalk';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={
            variant === 'chip'
              ? 'gap-1 h-8 px-2.5 rounded-full border border-[#2a3548] bg-[#0d121c] text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-[#1a2233] focus-visible:ring-0'
              : variant === 'inline'
                ? 'gap-1.5 h-9 px-2.5 rounded-full bg-transparent hover:bg-muted/20 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-0'
                : 'gap-1 h-9 px-2 bg-transparent hover:bg-muted/15 border-none shadow-none text-base md:text-[17px] font-semibold text-foreground/80 hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl'
          }
          disabled={disabled}
        >
          {(variant === 'inline' || variant === 'chip') && (
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActiveTurbo ? 'bg-amber-500' : 'bg-primary'}`} aria-hidden />
          )}
          <ActiveIcon className={`h-3.5 w-3.5 ${active.iconColor}`} />
          <span>{active.label}</span>
          <Badge variant="secondary" className={`text-[10px] font-semibold ${isActiveTurbo ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/15' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/15'}`}>
            {isActiveTurbo && !turboReady ? 'No key' : 'Active'}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5 bg-[#1e1f20]/95 backdrop-blur-2xl border border-border/10 rounded-2xl shadow-2xl">
        {PROVIDERS.map(p => {
          const Icon = p.icon;
          const isCurrent = p.id === provider;
          const isTurbo = p.id === 'turbo';
          return (
            <DropdownMenuItem
              key={p.id}
              onClick={() => onProviderChange(p.id)}
              className={`flex items-center justify-between gap-3 px-3 py-3 cursor-pointer rounded-xl transition-colors hover:bg-muted/30 focus:bg-muted/30 ${
                isCurrent ? 'bg-muted/20' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="shrink-0"><Icon className={`h-4 w-4 ${p.iconColor}`} /></span>
                <div className="text-left">
                  <div className="text-[13.5px] font-semibold text-foreground/90">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground/60 font-normal leading-normal">{p.sub}</div>
                </div>
              </div>
              {isTurbo && !turboReady && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">Add key</Badge>
              )}
              {isCurrent && (
                <Badge variant="secondary" className={`text-[10px] font-semibold ${isTurbo ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
