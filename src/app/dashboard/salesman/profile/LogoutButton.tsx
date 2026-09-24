'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="flex items-center justify-center gap-2 w-full py-4 bg-white dark:bg-slate-950 border border-alvoun-red/20 text-alvoun-red rounded-xl font-bold active:bg-alvoun-red/10 transition-colors shadow-sm text-base"
    >
      <LogOut className="h-5 w-5" />
      LOGOUT
    </button>
  );
}
