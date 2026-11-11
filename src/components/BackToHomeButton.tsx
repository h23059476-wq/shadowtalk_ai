import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isChatSessionActive } from "@/lib/growth/firstVisit";
import { cn } from "@/lib/utils";

export function BackToHomeButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  const path = useMemo(
    () => (location.pathname || "/").replace(/\/+$/, "") || "/",
    [location.pathname],
  );
  const isHome = path === "/" || path === "/home";
  const isChat = path === "/chatbot";
  const isAuth = path.startsWith("/auth");

  if (isHome) return null;
  if (isAuth) return null;
  // ChatHeader already renders its own Home button on /chatbot
  if (isChat) return null;

  return (
    <div
      className={cn("fixed z-[80] left-4 safe-top", className)}
      style={{ top: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => window.location.assign("/")}
        aria-label="Back to home"
        className={cn(
          "gap-2 rounded-full border-border/60 bg-background/70 backdrop-blur-md shadow-sm",
          "hover:bg-background/90 hover:border-primary/30",
        )}
      >
        <Home className="h-4 w-4" />
        <span className="text-sm">Back to Home</span>
      </Button>
    </div>
  );
}

