import React, { useState, useEffect, useCallback, useContext } from "react";
import { Menu, X, Bot, Shield, BookOpen, Users, History, User, Code, BarChart3, Building2, Settings, UserCircle, Brain, Sparkles, ChevronDown, MoreHorizontal, Download, Share, Smartphone, MessageSquare, CreditCard, Rocket, Tag, ShieldCheck, Presentation, Target, Store, Terminal, Eye, LayoutGrid, Globe, Clapperboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CommandPaletteContext } from "@/App";
import { FeedbackForm } from "@/components/FeedbackForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/components/AuthProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { StealthKillSwitch } from "@/components/StealthKillSwitch";
import { HardwarePassthrough } from "@/components/HardwarePassthrough";
import { TrustBadge } from "@/components/TrustBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useLandingMotionContext } from "@/components/landing/LandingMotionProvider";
import LandingStagger from "@/components/landing/LandingStagger";
import LandingAnimate from "@/components/landing/LandingAnimate";
import { ReferralModal } from "@/components/growth/ReferralModal";
import { Gift } from "lucide-react";

type NavigationProps = {
  /** Enable entrance + hover motion on the marketing home page */
  landingAnimated?: boolean;
};

const Navigation = ({ landingAnimated = false }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const navigate = useNavigate();
  const { open: openCommandPalette } = useContext(CommandPaletteContext);
  const { t } = useTranslation();
  const { user } = useAuth();
  const landingMotion = useLandingMotionContext();
  const animate = landingAnimated || landingMotion.isLandingPage;
  const { hoverLift, variants, viewport, profile } = landingMotion;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMac = /Macintosh/.test(navigator.userAgent);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    // Batch 5: name the appinstalled handler so the effect cleanup can remove
    // it. Previously it was an anonymous listener that leaked on unmount.
    const onInstalled = () => setIsInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setIsInstalled(true);
        setDeferredPrompt(null);
      } catch (e) {
        console.warn('[PWA] Prompt failed, showing guide:', e);
        setShowIOSGuide(true);
      }
    } else if ('getInstalledRelatedApps' in navigator) {
      // Check if already installed via Related Apps API
      try {
        const relatedApps = await (navigator as any).getInstalledRelatedApps();
        if (relatedApps.length > 0) {
          setIsInstalled(true);
          return;
        }
      } catch {}
      setShowIOSGuide(true);
    } else {
      setShowIOSGuide(true);
    }
  }, [deferredPrompt]);

  const primaryNavItems = [
    { name: "Shadow Twin", href: "/shadow-memory", icon: Brain, isLink: true },
  ];

  const secondaryNavItems = [
    { name: "Settings", href: "/settings", icon: Settings, isLink: true },
    { name: t("nav.profile"), href: "/profile", icon: User, isLink: true },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  const handleNavClick = (item: typeof primaryNavItems[0]) => {
    if (item.isLink) {
      navigate(item.href);
    } else {
      document.getElementById(item.href.substring(1))?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navClassName = "fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50";
  const navInner = (
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <LandingAnimate
            preset="fadeUp"
            inView={false}
            className="flex items-center gap-3"
            as={animate ? "div" : "div"}
          >
            <motion.div
              className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0 group"
              onClick={() => navigate("/chatbot")}
              whileHover={animate ? hoverLift : undefined}
            >
              <div className="relative">
                <Bot className="h-7 w-7 text-primary transition-all duration-300 group-hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full pulse-dot"
                  animate={animate && !profile.reduced ? { scale: [1, 1.35, 1] } : undefined}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span className="text-lg font-semibold tracking-tight gradient-text hidden sm:inline whitespace-nowrap">
                ShadowTalk AI
              </span>
            </motion.div>
            {user && <WorkspaceSwitcher />}
          </LandingAnimate>

          <LandingStagger className="hidden lg:flex items-center space-x-0.5" inView={false}>
            {primaryNavItems.map((item, i) => (
              <LandingAnimate key={item.name} preset="fadeUp" index={i} inView={false} as="div">
                <motion.button
                  onClick={() => handleNavClick(item)}
                  whileHover={animate ? hoverLift : undefined}
                  whileTap={animate ? { scale: 0.97 } : undefined}
                  className="flex items-center space-x-1.5 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </motion.button>
              </LandingAnimate>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-1.5 px-3.5 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all duration-200 text-sm font-medium">
                  <MoreHorizontal className="h-4 w-4" />
                  <span>More</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass-strong border-border/50">
                {secondaryNavItems.map((item, index) => (
                  <React.Fragment key={item.name}>
                    {index === 6 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={() => handleNavClick(item)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </DropdownMenuItem>
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </LandingStagger>

          <LandingStagger className="hidden lg:flex items-center space-x-1.5" inView={false}>
            <LandingAnimate preset="pop" index={0} inView={false} as="div">
              <TrustBadge />
            </LandingAnimate>
            <LandingAnimate preset="pop" index={1} inView={false} as="div">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsReferralOpen(true)}
                className="border-primary/40 text-primary hover:bg-primary/10 transition-all duration-200 gap-1.5 h-8 mr-1"
              >
                <Gift className="h-3.5 w-3.5" />
                Refer & Earn
              </Button>
            </LandingAnimate>
            <LandingAnimate preset="pop" index={2} inView={false} as="div">
              <StealthKillSwitch />
            </LandingAnimate>
            <LandingAnimate preset="pop" index={3} inView={false} as="div">
              <HardwarePassthrough />
            </LandingAnimate>
            {!isInstalled && (
              <LandingAnimate preset="fadeUp" inView={false} as="div">
                <motion.div whileHover={animate ? hoverLift : undefined}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInstallClick}
                    className="border-primary/40 text-primary hover:bg-primary/10 transition-all duration-200 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install App
                  </Button>
                </motion.div>
              </LandingAnimate>
            )}
            <LandingAnimate preset="fadeUp" inView={false} as="div">
              <NotificationBell />
            </LandingAnimate>
            <LandingAnimate preset="fadeUp" inView={false} as="div">
              <LanguageSwitcher />
            </LandingAnimate>
            <LandingAnimate preset="fadeUp" inView={false} as="div">
              <FeedbackForm />
            </LandingAnimate>
            <LandingAnimate preset="fadeUp" inView={false} as="div">
              <motion.div whileHover={animate ? hoverLift : undefined}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCommandPalette}
                  className="border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all duration-200 gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2.5"
                  title="Search all pages (Ctrl+K)"
                >
                  <Search className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs hidden xl:inline">Search</span>
                  <kbd className="hidden sm:inline-flex items-center text-[10px] bg-muted/80 text-muted-foreground px-1 py-0.2 rounded border border-border/40 font-mono">
                    ⌘K
                  </kbd>
                </Button>
              </motion.div>
            </LandingAnimate>
            <LandingAnimate preset="fadeUp" inView={false} as="div">
              <motion.div whileHover={animate ? hoverLift : undefined}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all duration-200"
                  onClick={() => navigate("/auth")}
                >
                  {t("nav.login")}
                </Button>
              </motion.div>
            </LandingAnimate>
            <LandingAnimate preset="pop" inView={false} as="div">
              <motion.div whileHover={animate ? hoverLift : undefined} whileTap={{ scale: 0.97 }}>
                <Button size="sm" className="btn-glow" onClick={() => navigate("/chatbot")}>
                  {t("nav.tryFree")}
                </Button>
              </motion.div>
            </LandingAnimate>
          </LandingStagger>

          <div className="flex items-center gap-1 lg:hidden">
            <button
              onClick={openCommandPalette}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors"
              aria-label="Search pages"
            >
              <Search className="h-5 w-5" />
            </button>
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-foreground hover:bg-muted/40 rounded-lg transition-colors"
            aria-label="Toggle menu"
            whileTap={animate ? { scale: 0.92 } : undefined}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isMenuOpen ? (
                <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <X className="h-6 w-6" />
                </motion.span>
              ) : (
                <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                  <Menu className="h-6 w-6" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          </div>
        </div>

        <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: profile.reduced ? 0.01 : 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="lg:hidden absolute top-16 left-0 right-0 glass-strong border-b border-border/50 shadow-lg overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <LandingStagger className="px-4 py-4 space-y-1" inView={false}>
              {user && (
                <div className="pb-3 mb-3 border-b border-border/50">
                  <WorkspaceSwitcher />
                </div>
              )}
              {allNavItems.map((item, i) => (
                <LandingAnimate key={item.name} preset="slideLeft" index={i} inView={false} as="div">
                  <motion.button
                    onClick={() => {
                      handleNavClick(item);
                      setIsMenuOpen(false);
                    }}
                    whileHover={animate ? { x: 4 } : undefined}
                    className="flex items-center space-x-3 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all w-full text-left px-3 py-2.5 rounded-lg"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </motion.button>
                </LandingAnimate>
              ))}
              <div className="flex flex-col space-y-2 pt-3 mt-3 border-t border-border/50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsReferralOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="mx-3 border-primary/40 text-primary hover:bg-primary/10 transition-all duration-200 gap-1.5 h-8"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Refer & Earn
                </Button>
                <div className="flex items-center justify-between px-3 py-2 glass-subtle rounded-lg">
                  <span className="text-xs font-medium text-muted-foreground">Stealth mode</span>
                  <StealthKillSwitch />
                </div>
                {!isInstalled && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mx-3 border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                    onClick={() => {
                      handleInstallClick();
                      setIsMenuOpen(false);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Install App
                  </Button>
                )}
                <div className="flex items-center gap-2 px-3">
                  <LanguageSwitcher />
                  <FeedbackForm />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mx-3"
                  onClick={() => {
                    navigate('/auth');
                    setIsMenuOpen(false);
                  }}
                >
                  {t("nav.login")}
                </Button>
                <Button
                  size="sm"
                  className="btn-glow mx-3"
                  onClick={() => {
                    navigate('/chatbot');
                    setIsMenuOpen(false);
                  }}
                >
                  {t("nav.tryFree")}
                </Button>
              </div>
            </LandingStagger>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
  );

  return (
    <>
    {animate ? (
      <motion.nav
        className={navClassName}
        initial="hidden"
        animate="visible"
        variants={variants.slideDown}
      >
        {navInner}
      </motion.nav>
    ) : (
      <nav className={navClassName}>{navInner}</nav>
    )}

    <AnimatePresence>
    {showIOSGuide && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={() => setShowIOSGuide(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="bg-background border border-border rounded-xl p-6 mx-4 max-w-sm shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/15 rounded-full p-2.5">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Install ShadowTalk AI</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {isIOS ? (
              <>
                <p className="font-medium text-foreground">On iPhone / iPad:</p>
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <p>Tap the <Share className="inline h-4 w-4 mx-0.5" /> <strong>Share</strong> button in Safari's toolbar</p>
                </div>
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                </div>
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <p>Tap <strong>"Add"</strong> to install</p>
                </div>
              </>
            ) : /Android/i.test(navigator.userAgent) ? (
              <>
                <p className="font-medium text-foreground">On Android:</p>
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <p>Tap the <strong>⋮ menu</strong> (three dots) in Chrome</p>
                </div>
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <p>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></p>
                </div>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">In your browser:</p>
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <p>Click the <strong>install icon</strong> in your browser's address bar (or menu → "Install app")</p>
                </div>
                <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <p>Click <strong>"Install"</strong> to confirm</p>
                </div>
              </>
            )}
          </div>
          <Button className="w-full mt-5" onClick={() => setShowIOSGuide(false)}>Got it</Button>
        </motion.div>
      </motion.div>
    )}
    </AnimatePresence>

    <ReferralModal isOpen={isReferralOpen} onClose={() => setIsReferralOpen(false)} />
    </>
  );
};

export default Navigation;