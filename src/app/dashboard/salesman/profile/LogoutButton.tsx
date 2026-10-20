'use client';

import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { salesmanLogout } from '@/lib/actions/salesman/session';

export default function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await salesmanLogout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="flex items-center justify-center gap-2 w-full min-h-[52px] py-4 bg-surface-raised border border-accent-terracotta/30 text-accent-terracotta hover:bg-accent-terracotta/10 rounded-2xl font-black active:scale-[0.98] transition-all shadow-raised-sm active:shadow-inset text-base disabled:opacity-50"
    >
      {loggingOut ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>LOGGING OUT...</span>
        </>
      ) : (
        <>
          <LogOut className="h-5 w-5" />
          <span>LOGOUT</span>
        </>
      )}
    </button>
  );
}
