import { useState, useEffect } from "react";
import { Shield, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export const TrustBadge = ({ className }: { className?: string }) => {
  const [cryptoAvailable, setCryptoAvailable] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
        setCryptoAvailable(true);
      } catch {
        setCryptoAvailable(false);
      }
    };
    check();
  }, []);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono transition-all border",
          cryptoAvailable
            ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
            : "border-warning/30 bg-warning/5 text-warning hover:bg-warning/10"
        )}
      >
        {cryptoAvailable ? <Shield className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
        <span className="hidden sm:inline">{cryptoAvailable ? "SECURITY ARCHITECTURE" : "CHECKING..."}</span>
        <span className="sm:hidden">{cryptoAvailable ? "🔒" : "..."}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-72 p-3 rounded-xl border border-border/50 bg-popover shadow-elevated z-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Security Architecture</span>
            </div>
            <div className="space-y-1.5 text-[10px] font-mono text-muted-foreground">
              <div className="flex justify-between">
                <span>Client-Side Encryption</span>
                <span className={cryptoAvailable ? "text-success" : "text-destructive"}>
                  {cryptoAvailable ? "AES-256-GCM ✓" : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Key Derivation</span>
                <span className="text-success">PBKDF2-600K</span>
              </div>
              <div className="flex justify-between">
                <span>Local Storage</span>
                <span className="text-success">IndexedDB</span>
              </div>
              <div className="flex justify-between">
                <span>Optional Offline AI</span>
                <span className="text-muted-foreground">User opt-in</span>
              </div>
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground/70 leading-relaxed">
              These features describe the technical architecture. No third-party audit has been conducted yet.
            </p>
            <Link
              to="/trust"
              className="mt-2 block text-center text-[10px] font-mono text-primary hover:underline"
              onClick={() => setExpanded(false)}
            >
              LEARN MORE →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
