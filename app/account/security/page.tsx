'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldOff, Loader2, AlertCircle, KeyRound, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandButton } from '@/components/ui/brand-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi, AuthApiError, type TwoFactorStatus, type TwoFactorSetup } from '@/lib/auth';

type View = 'loading' | 'idle' | 'setup' | 'backup';

function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Backup codes</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(codes.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy all'}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((c) => (
          <span key={c} className="rounded bg-background px-2 py-1 text-center">{c}</span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Save these now — each code works once and they won&apos;t be shown again.
      </p>
    </div>
  );
}

export default function SecurityPage() {
  const router = useRouter();
  const [view, setView] = React.useState<View>('loading');
  const [status, setStatus] = React.useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = React.useState<TwoFactorSetup | null>(null);
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadStatus = React.useCallback(async () => {
    try {
      setStatus(await authApi.twoFactorStatus());
      setView('idle');
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        router.replace('/login?redirect=/account/security');
        return;
      }
      setError('Could not load security settings.');
      setView('idle');
    }
  }, [router]);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function startSetup() {
    setError(null);
    setBusy(true);
    try {
      setSetup(await authApi.twoFactorSetup());
      setView('setup');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Could not start setup.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.twoFactorEnable(code);
      setBackupCodes(res.backupCodes);
      setCode('');
      setView('backup');
      await authApi.twoFactorStatus().then(setStatus).catch(() => undefined);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Could not enable 2FA.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError(null);
    setBusy(true);
    try {
      await authApi.twoFactorDisable(code);
      setCode('');
      await loadStatus();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Could not disable 2FA.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Security</h1>
        <p className="text-muted-foreground">Manage two-factor authentication for your account.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {status?.enabled ? (
              <ShieldCheck className="h-6 w-6 text-brand-pink" />
            ) : (
              <ShieldOff className="h-6 w-6 text-muted-foreground" />
            )}
            <div>
              <CardTitle>Two-factor authentication</CardTitle>
              <CardDescription>
                {status?.enabled
                  ? `Enabled · ${status.backupCodesRemaining} backup codes remaining`
                  : 'Add an extra layer of security using an authenticator app.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {view === 'loading' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {view === 'idle' && status && !status.enabled && (
            <BrandButton onClick={startSetup} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <KeyRound className="mr-2 h-4 w-4" /> Enable two-factor
            </BrandButton>
          )}

          {view === 'idle' && status?.enabled && (
            <div className="space-y-3">
              <Label htmlFor="disable-code">Enter a code to disable 2FA</Label>
              <Input
                id="disable-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456 or backup code"
                autoComplete="one-time-code"
              />
              <Button variant="destructive" onClick={disable} disabled={busy || code.length < 6}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable two-factor
              </Button>
            </div>
          )}

          {view === 'setup' && setup && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with Google Authenticator, 1Password, Authy, or any TOTP app — then enter the
                6-digit code to confirm.
              </p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setup.qrDataUrl} alt="2FA QR code" width={200} height={200} className="rounded-lg border border-border" />
              </div>
              <p className="break-all text-center text-xs text-muted-foreground">
                Or enter this key manually: <span className="font-mono">{setup.secret}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="enable-code">Verification code</Label>
                <Input
                  id="enable-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <BrandButton onClick={confirmEnable} disabled={busy || code.length < 6}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm & enable
                </BrandButton>
                <Button variant="secondary" onClick={() => { setView('idle'); setCode(''); setError(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {view === 'backup' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-brand-gradient/10 px-3 py-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-brand-pink" />
                Two-factor authentication is now enabled.
              </div>
              <BackupCodes codes={backupCodes} />
              <BrandButton onClick={() => setView('idle')}>Done</BrandButton>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
