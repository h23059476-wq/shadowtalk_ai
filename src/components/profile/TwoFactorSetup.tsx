/**
 * TwoFactorSetup — 2FA is not available in the current Firebase setup.
 *
 * Firebase MFA requires the Admin SDK for TOTP enrollment, which isn't
 * available in the browser-only auth adapter. Instead of showing a
 * broken 2FA enrollment flow (blank QR code, empty secret), we show
 * an informational card explaining that 2FA is coming soon.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Mail } from "lucide-react";

export const TwoFactorSetup = () => {
  return (
    <Card className="card-glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Two-Factor Authentication
        </CardTitle>
        <CardDescription>Add an extra layer of security to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/30">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">2FA Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Two-factor authentication requires server-side enrollment setup.
              We're working on adding TOTP-based 2FA support.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">In the meantime, protect your account:</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Use a strong, unique password
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Sign out of unused sessions below
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Enable Google sign-in for built-in 2FA via your Google account
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwoFactorSetup;
