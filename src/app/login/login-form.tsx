'use client';

import { useActionState, useState } from 'react';
import { authenticate } from '@/lib/actions';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';
import InstallPWA from './install-pwa';

export default function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <form action={formAction} className="space-y-4">
        {/* Login ID Input */}
        <Input
          id="loginId"
          label="Login ID"
          type="text"
          name="loginId"
          placeholder="Enter your login ID"
          required
          autoComplete="username"
          leftIcon={<Mail className="h-4 w-4" />}
          disabled={isPending}
        />

        {/* Password Input */}
        <div className="relative">
          <Input
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="••••••••••••"
            required
            minLength={6}
            autoComplete="current-password"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 rounded-lg text-muted hover:text-primary transition-colors cursor-pointer select-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            disabled={isPending}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isPending}
            rightIcon={
              !isPending ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              ) : undefined
            }
            className="w-full font-bold uppercase tracking-wider text-xs shadow-md"
          >
            {isPending ? 'Signing in...' : 'Sign In'}
          </Button>
        </div>
        
        {/* Secure notice */}
        <div className="flex items-center justify-center gap-1.5 pt-1 text-muted text-[11px] font-semibold tracking-wider uppercase select-none">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span>Encrypted Session</span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="pt-2 animate-fade-in-up">
            <AlertBanner variant="danger" title="Unable to sign in">
              {errorMessage}
            </AlertBanner>
          </div>
        )}
      </form>

      {/* PWA Install Button */}
      <InstallPWA />
    </div>
  );
}
