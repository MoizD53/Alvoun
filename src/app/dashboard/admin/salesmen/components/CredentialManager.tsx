'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resetSalesmanPassword, toggleSalesmanLoginAccess } from '@/lib/actions/admin/salesman-management';
import { Key, Shield, ShieldAlert, Check, X, Loader2, Eye, EyeOff } from 'lucide-react';

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
      if (result.error) throw new Error(result.error);
      
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
      if (result.error) throw new Error(result.error);
      
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
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-alvoun-blue" />
          Login Access
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {message && (
          <div className={`p-3 rounded-lg text-sm flex items-start ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> : <X className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
            {message.text}
          </div>
        )}

        <div>
          <div className="text-sm text-slate-500 mb-1">Current Login ID</div>
          <div className="font-medium text-slate-900 dark:text-slate-100 p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
            {loginId}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Access Status</div>
            <div className={`text-xs font-semibold mt-1 ${active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {active ? 'ACTIVE' : 'DISABLED'}
            </div>
          </div>
          <button
            onClick={handleToggleAccess}
            disabled={isToggling}
            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center ${
              active 
                ? 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50' 
                : 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
            }`}
          >
            {isToggling ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : active ? <ShieldAlert className="w-3 h-3 mr-1.5" /> : <Check className="w-3 h-3 mr-1.5" />}
            {active ? 'Disable Login' : 'Enable Login'}
          </button>
        </div>

        <hr className="border-slate-200 dark:border-slate-800" />

        <form onSubmit={handleResetPassword} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Reset Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-alvoun-blue focus:border-alvoun-blue dark:bg-slate-900 dark:text-white pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={isResetting || !newPassword}
            className="w-full flex justify-center items-center px-4 py-2 border border-slate-300 dark:border-slate-700 shadow-sm text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-alvoun-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResetting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...</>
            ) : (
              <><Key className="w-4 h-4 mr-2" /> Reset Password</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
