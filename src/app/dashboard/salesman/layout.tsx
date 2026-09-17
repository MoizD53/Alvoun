import { Home, Users, ShoppingBag, User, Droplet, LogOut } from 'lucide-react';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { getCurrentKolkataTime, isWorkingHours } from '@/lib/time';
import LocationTracker from './components/LocationTracker';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const workingHours = isWorkingHours(getCurrentKolkataTime());

  return (
    <div className={`max-w-md mx-auto sm:max-w-none bg-slate-50 min-h-screen flex flex-col ${workingHours ? 'pb-20' : ''}`}>
      {workingHours && <LocationTracker />}
      
      {/* Mobile Top Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-slate-200 dark:border-gray-800 sticky top-0 z-30 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center text-alvoun-blue">
          <Droplet className="h-6 w-6 fill-current" />
          <span className="ml-2 font-bold text-slate-900 dark:text-slate-100">ALVOUN</span>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <form action={async () => { 'use server'; await signOut(); }}>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full p-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      {workingHours && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto sm:max-w-none bg-white border-t border-slate-200 z-50 px-6 py-2 flex justify-between items-center pb-safe">
          <Link href="/dashboard/salesman" className="flex flex-col items-center text-slate-500 hover:text-alvoun-blue focus:text-alvoun-blue transition-colors">
            <Home className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-semibold">Home</span>
          </Link>
          <Link href="/dashboard/salesman/customers" className="flex flex-col items-center text-slate-500 hover:text-alvoun-blue focus:text-alvoun-blue transition-colors">
            <Users className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-semibold">Customers</span>
          </Link>
          <div className="flex flex-col items-center text-slate-300">
            <ShoppingBag className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-semibold">Sales</span>
          </div>
          <div className="flex flex-col items-center text-slate-300">
            <User className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-semibold">Profile</span>
          </div>
        </div>
      )}
    </div>
  );
}
