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
      className="flex items-center justify-center gap-2 w-full py-4 bg-white dark:bg-slate-950 border border-alvoun-red/20 text-alvoun-red rounded-xl font-bold active:bg-alvoun-red/10 transition-colors shadow-sm text-base disabled:opacity-50"
    >
      {loggingOut ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          LOGGING OUT...
        </>
      ) : (
        <>
          <LogOut className="h-5 w-5" />
          LOGOUT
        </>
      )}
    </button>
  );
}

