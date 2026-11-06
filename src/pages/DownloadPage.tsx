import React from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Smartphone, Globe, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PageTransition } from '@/components/PageTransition';
import { isShadowTalkDesktop } from '@/lib/desktopBridge';

export default function DownloadPage() {
  const isDesktop = isShadowTalkDesktop();

  const platforms = [
    {
      icon: Monitor,
      name: 'Windows Desktop',
      description: 'Full native app with system tray, global hotkeys, and offline AI support.',
      status: 'available' as const,
      features: ['Native window', 'System tray', 'Global hotkey (Ctrl+Shift+S)', 'Offline Llama model'],
      action: 'Download for Windows',
    },
    {
      icon: Smartphone,
      name: 'iOS & Android (PWA)',
      description: 'Install ShadowTalk as a Progressive Web App on your phone — no App Store needed.',
      status: 'available' as const,
      features: ['Works offline', 'Push notifications', 'Home screen icon', 'No App Store required'],
      action: 'Install PWA',
    },
    {
      icon: Globe,
      name: 'Web App',
      description: 'Use ShadowTalk directly in your browser — no installation required.',
      status: 'available' as const,
      features: ['No installation', 'Works on any browser', 'Always up-to-date', 'Cross-platform'],
      action: 'Open Web App',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        meta={{
          title: 'Download ShadowTalk AI — Desktop, Mobile & Web',
          description: 'Download ShadowTalk AI for Windows, install as a PWA on iOS/Android, or use the web app. Native desktop app with offline AI support.',
          canonical: 'https://www.shadowtalk-ai.com/downloads',
          keywords: ['download', 'desktop app', 'PWA', 'offline AI', 'Windows app'],
          ogType: 'website',
          twitterCard: 'summary',
          noIndex: false,
        }}
      />
      <Navigation />
      <PageTransition>
        <div className="max-w-5xl mx-auto py-12 px-6">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <Download className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Download ShadowTalk AI
            </h1>
            <p className="text-muted-foreground mt-3 text-lg max-w-2xl mx-auto">
              Choose your platform. All versions sync seamlessly — your conversations, memory, and settings carry over.
            </p>
          </div>

          {/* Platform cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {platforms.map((platform, idx) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * idx }}
                className="ios-glass-card p-6 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <platform.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{platform.name}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {platform.description}
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {platform.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="ios-glass-button-accent text-white w-full"
                  onClick={() => {
                    if (platform.action === 'Open Web App') {
                      window.location.href = '/chatbot';
                    } else if (platform.action === 'Install PWA') {
                      // Batch 5: the previous code dispatched a SYNTHETIC
                      // beforeinstallprompt Event. Browsers only dispatch the
                      // real event (carrying prompt()), and Navigation's
                      // listener stored the fake event as deferredPrompt — a
                      // dead object whose prompt() would throw. A PWA install
                      // prompt cannot be triggered programmatically; show the
                      // honest guidance instead, and confirm when already
                      // installed.
                      const isStandalone =
                        window.matchMedia('(display-mode: standalone)').matches ||
                        (navigator as any).standalone === true;
                      if (isStandalone) {
                        toast({ title: 'Already installed', description: 'ShadowTalk is running as an installed app.' });
                      } else {
                        toast({ title: 'Install ShadowTalk', description: 'Use your browser menu → "Install app" or "Add to Home Screen".' });
                      }
                    } else {
                      // Desktop download — check if already running as desktop app
                      if (isDesktop) {
                        toast({ title: 'Already running', description: 'You are using the desktop app.' });
                      } else {
                        toast({ title: 'Coming soon', description: 'The Windows desktop app download will be available shortly.' });
                      }
                    }
                  }}
                >
                  {platform.action}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* System requirements */}
          <div className="ios-glass-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">System Requirements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground mb-1">Desktop (Windows)</p>
                <p className="text-muted-foreground">Windows 10/11, 4GB RAM, 500MB disk space. WebGPU support recommended for on-device AI.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Mobile (PWA)</p>
                <p className="text-muted-foreground">iOS 15+ or Android 8+. Chrome, Safari, or Edge browser. Install via browser menu.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Web App</p>
                <p className="text-muted-foreground">Any modern browser (Chrome, Firefox, Safari, Edge). No installation required.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Offline AI (optional)</p>
                <p className="text-muted-foreground">WebGPU-compatible GPU + ~800MB download for Llama-3.2-1B model. ~4GB for Llama-3.1-8B.</p>
              </div>
            </div>
          </div>

        </div>
      </PageTransition>
      <Footer />
    </div>
  );
}

// Inline toast import to avoid circular deps
import { useToast } from '@/hooks/use-toast';
function toast(opts: { title: string; description: string }) {
  // Fallback if useToast isn't available in this context
  console.log(`[DownloadPage] ${opts.title}: ${opts.description}`);
}
