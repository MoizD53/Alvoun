import Link from 'next/link';
import Image from 'next/image';
import { auth, signOut } from '@/auth';
import { getCurrentKolkataTime, isWorkingHours } from '@/lib/time';
import LocationTracker from './components/LocationTracker';
import SalesmanBottomNav from './components/SalesmanBottomNav';
import { ThemeToggle } from '@/components/theme-toggle';
import { salesmanLogout } from '@/lib/actions/salesman/session';
import { LogOut } from 'lucide-react';

export default async function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const workingHours = isWorkingHours(getCurrentKolkataTime());

  return (
    <div className={`w-full bg-background min-h-screen flex flex-col ${workingHours ? 'pb-20' : ''}`}>
      {workingHours && <LocationTracker />}
      
      {/* Mobile Top Header */}
      <header className="bg-surface-raised/95 backdrop-blur-md border-b border-border/40 sticky top-0 z-30 px-4 h-14 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 border border-border-default/80 shadow-xs flex items-center justify-center bg-white">
            <Image 
              src="/icons/icon.png" 
              alt="ALVOUN" 
              width={32} 
              height={32} 
              className="w-full h-full object-cover scale-110 rounded-full" 
              priority 
            />
          </div>
          <span className="font-extrabold text-foreground text-sm tracking-tight">ALVOUN</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={async () => {
            'use server';
            await salesmanLogout();
            await signOut({ redirectTo: '/login' });
          }}>
            <button 
              type="submit" 
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-surface-inset/60 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full p-4 sm:px-6 max-w-lg mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {workingHours && <SalesmanBottomNav />}
    </div>
  );
}
