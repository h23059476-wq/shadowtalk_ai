import { ReactNode, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  X,
  ChevronDown,
  Bot,
  Sparkles,
  Brain,
  Shield,
  Copy,
  Check,
  Zap,
  Users,
  CreditCard,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatbotLogo from '../ChatbotLogo';
import { FOUNDER_CANONICAL } from '@/lib/founderIdentity';
import { COFOUNDER_CANONICAL } from '@/lib/cofounderIdentity';

interface LandingNavigationProps {
  children?: ReactNode;
}

const LandingNavigation = ({ children }: LandingNavigationProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Accordion section state (xAI style)
  const [expandedSection, setExpandedSection] = useState<string | null>('services');

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keyboard accessibility: Escape key closes drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const copyBusinessEmail = useCallback(() => {
    navigator.clipboard.writeText('shadowtalk@shadowtalk-ai.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }, []);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pt-3 sm:pt-5 px-3 sm:px-6 pointer-events-none flex justify-center">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          className={`pointer-events-auto flex items-center justify-between transition-all duration-300 ease-out 
            w-full max-w-[1400px] ${
              scrolled
                ? 'shadow-[0_12px_36px_rgba(0,0,0,0.5)] bg-slate-900/90 border-white/15'
                : 'shadow-[0_8px_30px_rgba(0,0,0,0.35)] bg-slate-900/75 border-white/10'
            }
            rounded-full backdrop-blur-2xl border px-3 sm:px-5 py-2 gap-3`}
        >
          {/* Logo Section */}
          <a href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 whitespace-nowrap select-none group mr-2">
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-slate-950 border border-white/15 shadow-inner group-hover:scale-105 transition-transform shrink-0">
              <ChatbotLogo size={20} className="relative z-10" />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-widest text-white uppercase shrink-0 whitespace-nowrap">
              ShadowTalk
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center justify-center gap-5 flex-1 mx-2" aria-label="Main navigation">
            <a
              href="#services"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-cyan-400 transition-colors shrink-0 whitespace-nowrap px-1.5 py-1"
            >
              Services
            </a>
            <div className="h-3 w-px bg-slate-700/60 shrink-0" />
            <a
              href="#founders"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-purple-400 transition-colors shrink-0 whitespace-nowrap px-1.5 py-1"
            >
              Founders
            </a>
            <div className="h-3 w-px bg-slate-700/60 shrink-0" />
            <a
              href="#pricing"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-emerald-400 transition-colors shrink-0 whitespace-nowrap px-1.5 py-1"
            >
              Pricing
            </a>
            <a
              href="/benchmarks"
              className="hidden md:inline-flex items-center text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 sm:px-3 py-1.5 rounded-md hover:bg-muted/40"
            >
              Benchmarks
            </a>
            <div className="h-3 w-px bg-slate-700/60 shrink-0" />
            <a
              href="#contact"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-pink-400 transition-colors shrink-0 whitespace-nowrap px-1.5 py-1"
            >
              Contact
            </a>
          </nav>

          {/* Action Group: Sign Up + Open App + Minimalist Glass Hamburger Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 whitespace-nowrap ml-auto">
            {/* Sign Up Button */}
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 backdrop-blur-md px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-400/20 hover:border-cyan-400/60 hover:text-cyan-200 whitespace-nowrap shrink-0"
            >
              <span className="whitespace-nowrap">Sign Up</span>
            </Link>

            {/* Primary Open App Button */}
            <Link
              to="/chatbot"
              className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full p-[1px] shrink-0 whitespace-nowrap"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
              <span className="nav-cta-3d relative flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500/90 to-purple-500/90 backdrop-blur-md px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-purple-400 whitespace-nowrap shrink-0 shadow-md">
                <span className="whitespace-nowrap">Open App</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 shrink-0" />
              </span>
            </Link>

            {/* Minimalist Glass Icon Button */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/90 border border-white/15 hover:border-cyan-400/40 text-slate-200 hover:text-white transition-all duration-300 shadow-md group cursor-pointer shrink-0"
              aria-label="Open navigation menu (Services, Founders, Contact, Pricing)"
              title="Open Navigation Menu"
            >
              <div className="flex flex-col justify-center items-center gap-[3.5px] w-4 h-4 shrink-0">
                <span className="w-4 h-[1.5px] bg-slate-300 group-hover:bg-cyan-400 rounded-full transition-all duration-300 group-hover:w-4.5" />
                <span className="w-3 h-[1.5px] bg-purple-400 group-hover:bg-purple-300 rounded-full transition-all duration-300 group-hover:w-4.5" />
                <span className="w-4 h-[1.5px] bg-slate-300 group-hover:bg-pink-400 rounded-full transition-all duration-300 group-hover:w-4.5" />
              </div>
            </button>
          </div>
        </motion.div>

        {/* Invisible full-screen wrapper for children if any */}
        <div className="absolute top-0 left-0 w-full pointer-events-none">
          {children}
        </div>
      </header>

      {/* xAI / SpaceX Style Clean Minimal Navigation Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[99999] flex justify-end">
            {/* Backdrop Blur & Dimmer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
              aria-hidden="true"
            />

            {/* xAI-Inspired Clean Drawer Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ backgroundColor: '#000000' }}
              className="relative w-full sm:max-w-md h-full flex flex-col z-10 border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.9)] text-slate-100 overflow-hidden"
              role="dialog"
              aria-label="Site Navigation"
              aria-modal="true"
            >
              {/* xAI Style Top Bar: Logo on Left, Large Round 'X' Button on Right */}
              <div className="px-6 sm:px-8 pt-8 pb-6 flex items-center justify-between shrink-0">
                <Link to="/" onClick={closeDrawer} className="flex items-center gap-3 select-none group">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 border border-white/15">
                    <ChatbotLogo size={20} />
                  </div>
                  <span className="text-base font-bold tracking-widest text-white uppercase font-sans">
                    ShadowTalk
                  </span>
                </Link>

                {/* Circular Close Button (Exactly like xAI screenshot) */}
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="h-11 w-11 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5 stroke-[1.5]" />
                </button>
              </div>

              {/* xAI Style Navigation List with Delicate Dividers */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="divide-y divide-white/[0.12] border-t border-white/[0.12]">
                  
                  {/* 1. SERVICES & AI TOOLS (Expandable Accordion) */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => toggleSection('services')}
                      className="w-full py-4 flex items-center justify-between text-left text-lg sm:text-xl font-normal text-white hover:text-cyan-400 transition-colors cursor-pointer group"
                    >
                      <span className="tracking-tight">Services & AI Tools</span>
                      <ChevronDown
                        className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${
                          expandedSection === 'services' ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {expandedSection === 'services' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden pb-4 pl-2 space-y-3.5 text-sm"
                        >
                          <Link
                            to="/chatbot"
                            onClick={closeDrawer}
                            className="block text-neutral-300 hover:text-white transition-colors"
                          >
                            <p className="font-medium text-white">Autonomous Chatbot</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Multi-model reasoning & native agentic tools</p>
                          </Link>

                          <Link
                            to="/workspace"
                            onClick={closeDrawer}
                            className="block text-neutral-300 hover:text-white transition-colors"
                          >
                            <p className="font-medium text-white">Agentic Workspace</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Multi-step agents & tool chaining</p>
                          </Link>

                          <Link
                            to="/deep-research"
                            onClick={closeDrawer}
                            className="block text-neutral-300 hover:text-white transition-colors"
                          >
                            <p className="font-medium text-white">Deep Research Engine</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Multi-source web synthesis & citations</p>
                          </Link>

                          <Link
                            to="/private-ai"
                            onClick={closeDrawer}
                            className="block text-neutral-300 hover:text-white transition-colors"
                          >
                            <p className="font-medium text-white">Private AI & Vault</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Optional on-device WebGPU models</p>
                          </Link>

                          <Link
                            to="/studio"
                            onClick={closeDrawer}
                            className="block text-xs text-neutral-400 hover:text-cyan-400 transition-colors pt-1"
                          >
                            Model Studio & Code Playground &rarr;
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 2. ABOUT US / FOUNDERS (Expandable Accordion) */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => toggleSection('founders')}
                      className="w-full py-4 flex items-center justify-between text-left text-lg sm:text-xl font-normal text-white hover:text-purple-400 transition-colors cursor-pointer group"
                    >
                      <span className="tracking-tight">About Us / Founders</span>
                      <ChevronDown
                        className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${
                          expandedSection === 'founders' ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {expandedSection === 'founders' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden pb-4 pl-2 space-y-3.5 text-sm"
                        >
                          <Link
                            to="/founder"
                            onClick={closeDrawer}
                            className="block text-neutral-300 hover:text-white transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-white">Zain Ahmed</p>
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/25">
                                Founder & Lead Architect
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5">System design & local model loops</p>
                          </Link>

                          <Link
                            to="/fatima"
                            onClick={closeDrawer}
                            className="block text-neutral-300 hover:text-white transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="h-4 w-4 rounded bg-purple-950/80 border border-purple-500/30 font-mono text-[9px] font-bold text-purple-300 flex items-center justify-center">
                                  FT
                                </span>
                                <p className="font-medium text-white">Fatima</p>
                              </div>
                              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/25">
                                Co-Founder & Systems Architect
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5 pl-6">High-performance UI state machine & zero-leak telemetry</p>
                          </Link>

                          <div className="flex items-center gap-4 pt-1 text-xs text-neutral-400">
                            <Link to="/about" onClick={closeDrawer} className="hover:text-white transition-colors">
                              Company Vision
                            </Link>
                            <span className="text-neutral-700">&bull;</span>
                            <Link to="/trust" onClick={closeDrawer} className="hover:text-white transition-colors">
                              Security & Trust
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 3. PRICING & ACCESS (Expandable or Direct) */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => toggleSection('pricing')}
                      className="w-full py-4 flex items-center justify-between text-left text-lg sm:text-xl font-normal text-white hover:text-emerald-400 transition-colors cursor-pointer group"
                    >
                      <span className="tracking-tight">Pricing & Access</span>
                      <ChevronDown
                        className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${
                          expandedSection === 'pricing' ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {expandedSection === 'pricing' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden pb-4 pl-2 space-y-2 text-sm"
                        >
                          <Link
                            to="/pricing"
                            onClick={closeDrawer}
                            className="block text-neutral-300 hover:text-white transition-colors"
                          >
                            <p className="font-medium text-white">Membership Plans & Pricing</p>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              Free ($0) &bull; Pro ($5/mo)
                            </p>
                            <p className="text-[11px] text-emerald-400 font-mono mt-1">
                              No credit card required for Free
                            </p>
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 4. CONTACT DETAILS & SUPPORT (Expandable Accordion) */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => toggleSection('contact')}
                      className="w-full py-4 flex items-center justify-between text-left text-lg sm:text-xl font-normal text-white hover:text-pink-400 transition-colors cursor-pointer group"
                    >
                      <span className="tracking-tight">Contact Details & Support</span>
                      <ChevronDown
                        className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${
                          expandedSection === 'contact' ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {expandedSection === 'contact' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden pb-4 pl-2 space-y-3 text-sm"
                        >
                          {/* Official Business Email with Copy Button */}
                          <div className="flex items-center justify-between py-1">
                            <div>
                              <p className="text-[10px] text-neutral-500 uppercase font-mono">Official Business Email</p>
                              <a
                                href="mailto:shadowtalk@shadowtalk-ai.com"
                                className="text-xs sm:text-sm font-mono text-white hover:text-cyan-300 transition-colors"
                              >
                                shadowtalk@shadowtalk-ai.com
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={copyBusinessEmail}
                              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
                            >
                              {copiedEmail ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400 text-[10px]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span className="text-[10px]">Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Quick support channels */}
                          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                            <Link to="/contact" onClick={closeDrawer} className="text-neutral-400 hover:text-white transition-colors py-1">
                              Contact Form &rarr;
                            </Link>
                            <Link to="/status" onClick={closeDrawer} className="text-neutral-400 hover:text-white transition-colors py-1">
                              Live Status &rarr;
                            </Link>
                            <Link to="/faq" onClick={closeDrawer} className="text-neutral-400 hover:text-white transition-colors py-1">
                              FAQ &rarr;
                            </Link>
                            <Link to="/help" onClick={closeDrawer} className="text-neutral-400 hover:text-white transition-colors py-1">
                              Help Center &rarr;
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* xAI Style Bottom Pill Button & Sub-links */}
              <div className="px-6 sm:px-8 pb-8 pt-4 shrink-0 space-y-4">
                {/* Sign Up Button — full-width, cyan accent */}
                <Link
                  to="/auth"
                  onClick={closeDrawer}
                  className="w-full py-4 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 font-semibold text-center text-sm sm:text-base hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-colors block active:scale-[0.99]"
                >
                  Sign Up Free
                </Link>

                {/* Full-width Black & White Pill CTA Button */}
                <Link
                  to="/chatbot"
                  onClick={closeDrawer}
                  className="w-full py-4 rounded-full bg-white text-black font-semibold text-center text-sm sm:text-base hover:bg-neutral-200 transition-colors block shadow-lg active:scale-[0.99]"
                >
                  Launch Workspace
                </Link>

                {/* Sub-links row (Contact · Legal · News style) */}
                <div className="flex items-center justify-center gap-3 text-xs text-neutral-500 font-normal">
                  <Link to="/contact" onClick={closeDrawer} className="hover:text-neutral-300 transition-colors">
                    Contact
                  </Link>
                  <span>&bull;</span>
                  <Link to="/terms" onClick={closeDrawer} className="hover:text-neutral-300 transition-colors">
                    Legal
                  </Link>
                  <span>&bull;</span>
                  <Link to="/status" onClick={closeDrawer} className="hover:text-neutral-300 transition-colors">
                    Status
                  </Link>
                  <span>&bull;</span>
                  <Link to="/docs" onClick={closeDrawer} className="hover:text-neutral-300 transition-colors">
                    Docs
                  </Link>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LandingNavigation;
