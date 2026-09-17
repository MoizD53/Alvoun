import { Home, Users, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { getCurrentKolkataTime, isWorkingHours } from '@/lib/time';
import LocationTracker from './components/LocationTracker';

export default async function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const workingHours = isWorkingHours(getCurrentKolkataTime());

  return (
    <div className={`max-w-md mx-auto sm:max-w-none ${workingHours ? 'pb-24' : ''}`}>
      {workingHours && <LocationTracker />}
      {/* Mobile-first main content container */}
      <div className="w-full">
        {children}
      </div>

      {/* Bottom Navigation */}
      {workingHours && (
        <>
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-6 py-3 flex justify-between items-center sm:hidden">
            <Link href="/dashboard/salesman" className="flex flex-col items-center text-slate-500 hover:text-alvoun-blue">
              <Home className="h-6 w-6" />
              <span className="text-[10px] mt-1 font-medium">Home</span>
            </Link>
            <Link href="/dashboard/salesman/customers" className="flex flex-col items-center text-slate-500 hover:text-alvoun-blue">
              <Users className="h-6 w-6" />
              <span className="text-[10px] mt-1 font-medium">Customers</span>
            </Link>
            <div className="flex flex-col items-center text-slate-300">
              <ShoppingBag className="h-6 w-6" />
              <span className="text-[10px] mt-1 font-medium">Sales</span>
            </div>
            <div className="flex flex-col items-center text-slate-300">
              <User className="h-6 w-6" />
              <span className="text-[10px] mt-1 font-medium">Profile</span>
            </div>
          </div>
          
          <div className="hidden sm:flex fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 p-4 justify-center gap-8">
            <Link href="/dashboard/salesman" className="flex items-center gap-2 text-slate-600 hover:text-alvoun-blue font-medium">
              <Home className="h-5 w-5" /> Home
            </Link>
            <Link href="/dashboard/salesman/customers" className="flex items-center gap-2 text-slate-600 hover:text-alvoun-blue font-medium">
              <Users className="h-5 w-5" /> Customers
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
