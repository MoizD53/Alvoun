'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resetSalesmanPassword, toggleSalesmanLoginAccess } from '@/lib/actions/admin/salesman-management';
import { Key, Shield, ShieldAlert, Check, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';

export default function CredentialManager({ 
  profileId, 
  loginId,
  isActive 
}: { 
  profileId: string;
  loginId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    setActive(isActive);
  }, [isActive]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setIsResetting(true);
    setMessage(null);

    try {
      const result = await resetSalesmanPassword(profileId, newPassword);
      if (result?.error) throw new Error(result.error);
      
      setMessage({ type: 'success', text: 'Password reset successfully.' });
      setNewPassword('');
      setShowPassword(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleAccess = async () => {
    setIsToggling(true);
    setMessage(null);
    const nextActive = !active;

    try {
      const result = await toggleSalesmanLoginAccess(profileId, nextActive);
      if (result?.error) throw new Error(result.error);
      
      setActive(nextActive);
      router.refresh();
      setMessage({ type: 'success', text: `Login access ${nextActive ? 'enabled' : 'disabled'}.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
      <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Login Access Control
        </h2>
        <Badge variant={active ? 'success' : 'danger'} size="sm">
          {active ? 'ACTIVE' : 'DISABLED'}
        </Badge>
      </div>

      <div className="p-6 space-y-5">
        {message && (
          <AlertBanner
            variant={message.type === 'success' ? 'success' : 'danger'}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </AlertBanner>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Registered Login ID
          </label>
          <div className="font-mono text-xs font-semibold text-foreground px-3.5 py-2.5 bg-surface-inset shadow-inset rounded-xl border border-border/40 truncate">
            {loginId}
          </div>
        </div>

        {/* Access Status Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-surface-inset shadow-inset rounded-xl border border-border/40">
          <div>
            <div className="text-xs font-semibold text-foreground">App Access</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {active ? 'Salesman can log in' : 'Login disabled by admin'}
            </div>
          </div>
          <Button
            type="button"
            variant={active ? 'danger' : 'primary'}
            size="sm"
            onClick={handleToggleAccess}
            isLoading={isToggling}
            className="shadow-raised hover:shadow-raised-sm press-active"
          >
            {active ? 'Disable Login' : 'Enable Login'}
          </Button>
        </div>

        <div className="pt-2 border-t border-border/40">
          <form onSubmit={handleResetPassword} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reset Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                className="w-full rounded-xl bg-surface-inset shadow-inset border border-border/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!newPassword || isResetting}
              isLoading={isResetting}
              className="w-full"
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              Reset Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
