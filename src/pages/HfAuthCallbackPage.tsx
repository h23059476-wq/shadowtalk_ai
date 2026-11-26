/**
 * Tier 2 — OAuth redirect target for "Sign in with Hugging Face".
 *
 * Receives ?code=...&state=... (or ?error=...), exchanges the code through
 * hfOAuth.ts (PKCE verifier comes from the same tab's sessionStorage), stores
 * the credentials, and hands the user back to Settings → BYOK with a result
 * banner. Deliberately tiny: everything security-relevant lives in hfOAuth.ts
 * (unit tested); this page only renders the outcome.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { handleHfCallback } from "@/lib/auth/hfOAuth";

export default function HfAuthCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"working" | "ok" | "failed">("working");
  const [message, setMessage] = useState("");
  const ranRef = useRef(false);

  useEffect(() => {
    // React 18 StrictMode double-invokes effects in dev — the token exchange
    // is single-use, so guard against a second run.
    if (ranRef.current) return;
    ranRef.current = true;
    const search = new URLSearchParams(window.location.search);
    handleHfCallback({
      code: search.get("code"),
      state: search.get("state"),
      error: search.get("error"),
      errorDescription: search.get("error_description"),
    })
      .then((result) => {
        // NOTE: the app compiles with strict:false — `!result.ok` does NOT
        // narrow the discriminated union in this mode; use an equality check.
        if (result.ok === false) {
          setMessage(result.reason);
          setState("failed");
          return;
        }
        setMessage(
          result.success.username
            ? `Hugging Face account @${result.success.username} connected — free ZeroGPU image generation now uses your personal daily quota.`
            : "Hugging Face account connected — free ZeroGPU image generation now uses your personal daily quota.",
        );
        setState("ok");
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Sign-in failed unexpectedly.");
        setState("failed");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md card-glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {state === "working" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {state === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            {state === "failed" && <XCircle className="h-4 w-4 text-rose-400" />}
            Hugging Face sign-in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {state === "working"
              ? "Finishing the secure handshake with huggingface.co…"
              : message}
          </p>
          {state !== "working" && (
            <Button
              className="w-full"
              variant={state === "ok" ? "default" : "outline"}
              onClick={() => navigate("/settings?section=byok", { replace: true })}
            >
              Back to Settings → BYOK
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
