import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Consent-gated recovery for pre-UID-namespacing E2EE vaults.
 *
 * When a signed-in user has no vault of their own yet but device-global legacy
 * material exists (an encrypted vault created before vaults were scoped to
 * accounts), the local engine defers creating a fresh vault and the UI offers
 * this recovery instead:
 *
 *  1. The user proves ownership by entering the legacy passphrase (verified
 *     against the stored legacy fingerprint — a wrong passphrase can never
 *     claim the vault).
 *  2. Only after verification does the user explicitly choose to restore;
 *     the verified salt + fingerprint are then copied into this account's
 *     namespace and the legacy key is re-derived so old ciphertext decrypts.
 *  3. Declining starts a fresh vault — exactly the previous behavior. The
 *     legacy material is never deleted and an existing account vault is never
 *     overwritten.
 */
interface LegacyVaultRecoveryDialogProps {
  open: boolean;
  busy?: boolean;
  /** Verifies + commits the legacy vault. Returns true on success. */
  onRestore: (passphrase: string) => Promise<boolean>;
  /** Decline recovery — engage a brand-new vault instead. */
  onStartFresh: () => void;
  /** Close without deciding (may be re-opened from the encryption toggle). */
  onDismiss: () => void;
}

export function LegacyVaultRecoveryDialog({
  open,
  busy,
  onRestore,
  onStartFresh,
  onDismiss,
}: LegacyVaultRecoveryDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const reset = () => {
    setPassphrase("");
    setError(null);
    setWorking(false);
  };

  const handleRestore = async () => {
    if (!passphrase || working) return;
    setWorking(true);
    setError(null);
    const ok = await onRestore(passphrase);
    if (ok) {
      reset();
    } else {
      setWorking(false);
      setError("The passphrase did not match the legacy vault. Recovery denied.");
    }
  };

  const handleStartFresh = () => {
    reset();
    onStartFresh();
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleDismiss(); }}>
      <DialogContent className="bg-card border-border rounded-2xl max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Found an older encrypted vault</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground space-y-3 text-center">
              <p>
                This browser holds an encrypted vault created before vaults were
                scoped to individual accounts. If it is yours, enter its
                passphrase to restore it to your account — older encrypted
                messages will become readable again.
              </p>
              <ul className="text-left text-xs space-y-1.5 bg-muted/40 rounded-lg p-3 border border-border/50">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  Ownership is proven cryptographically — a wrong passphrase can never claim the vault
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  Starting fresh instead leaves the old vault untouched on this device
                </li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Legacy vault passphrase"
            value={passphrase}
            autoComplete="off"
            disabled={working || busy}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleRestore(); }}
            aria-label="Legacy vault passphrase"
          />
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={!passphrase || working || busy}
            onClick={() => void handleRestore()}
          >
            {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Restore legacy vault
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            disabled={working || busy}
            onClick={handleStartFresh}
          >
            Start a fresh vault instead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
