import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageSquare, Shield, Activity, HelpCircle, Copy, Check, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const LandingContactSection = () => {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText("shadowtalk@shadowtalk-ai.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="contact"
      className="py-16 md:py-24 px-4 bg-slate-950/80 border-t border-white/10 relative overflow-hidden"
      aria-labelledby="contact-section-heading"
    >
      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <Badge variant="secondary" className="mb-3 px-3 py-1 bg-pink-500/10 text-pink-400 border-pink-500/20">
            <Mail className="h-3 w-3 mr-1" aria-hidden />
            Contact Details & Direct Support
          </Badge>
          <h2 id="contact-section-heading" className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">
            Get in Touch With the <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Founders & Team</span>
          </h2>
          <p className="text-sm text-slate-400">
            Have questions about sovereign local models, enterprise missions, or custom agent setups? We respond directly from Karachi, Pakistan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Official Email */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-pink-500/30 flex flex-col justify-between shadow-xl">
            <div>
              <div className="h-10 w-10 rounded-xl bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-400 mb-4">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Official Business Email</h3>
              <p className="text-xs text-slate-400 mb-4">
                Direct inbox for partnerships, media inquiries, and technical questions.
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 mb-4">
                <p className="text-xs font-mono text-pink-300 break-all select-all font-semibold">
                  shadowtalk@shadowtalk-ai.com
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyEmail}
                className="flex-1 border-white/15 hover:bg-slate-800 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Email
                  </>
                )}
              </Button>
              <Button
                variant="default"
                size="sm"
                asChild
                className="flex-1 bg-pink-600 hover:bg-pink-500 text-white text-xs"
              >
                <a href="mailto:shadowtalk@shadowtalk-ai.com">
                  Write Email
                </a>
              </Button>
            </div>
          </div>

          {/* Card 2: Contact Desk & Inquiry Form */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Inquiry Contact Desk</h3>
              <p className="text-xs text-slate-400 mb-4">
                Submit an inquiry directly through our web interface with category selection and automatic dispatch.
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Monitored 7 days a week</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Secure & zero-spam guarantee</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="default"
                size="sm"
                asChild
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
              >
                <Link to="/contact">
                  Open Contact Desk
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 3: Help Center & System Status */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="h-10 w-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Guides & System Status</h3>
              <p className="text-xs text-slate-400 mb-4">
                Instant self-serve answers, architectural documentation, and live uptime verification.
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <Link to="/status" className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Platform Status
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">99.9%</span>
                </Link>
                <Link to="/help" className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 transition-colors">
                  <span>Help Center & Guides</span>
                  <span className="text-[11px] text-purple-400">Read →</span>
                </Link>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full border-white/15 hover:bg-slate-800 text-xs"
              >
                <Link to="/faq">
                  Browse Full FAQ
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingContactSection;
