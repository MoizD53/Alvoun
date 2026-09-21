import { auth } from '@/auth';
import { getDashboardStats } from '@/lib/actions/salesman/dashboard';
import Link from 'next/link';
import { formatMoney, formatNumber } from '@/lib/format';
import { Store, Navigation, Receipt, IndianRupee, Clock, CheckCircle2, Moon, MapPin, Map as MapIcon } from 'lucide-react';

export default async function SalesmanDashboard() {
  const session = await auth();
  
  let stats;
  let sessionState = 'ACTIVE';

  try {
    stats = await getDashboardStats();
  } catch (error: any) {
    if (error.message === 'NOT_STARTED') {
      sessionState = 'NOT_STARTED';
    } else if (error.message === 'SESSION_ENDED') {
      sessionState = 'SESSION_ENDED';
    } else {
      throw error;
    }
  }

  // Generate dynamic greeting based on IST time
  const hour = new Date().getUTCHours() + 5.5; // Rough IST approx for greeting
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  if (sessionState === 'NOT_STARTED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 animate-fade-in-up">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <Clock className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Not Working Hours</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Work sessions are active between <br/><strong className="text-slate-700 dark:text-slate-300">7:00 AM — 7:00 PM</strong></p>
        <div className="bg-blue-50 dark:bg-blue-900/20 text-alvoun-blue px-4 py-3 rounded-xl text-sm font-medium border border-blue-100">
          Check back during working hours to start your day.
        </div>
      </div>
    );
  }

  if (sessionState === 'SESSION_ENDED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 animate-fade-in-up">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <Moon className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Session Ended</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Your work day has concluded. <br/><strong className="text-slate-700 dark:text-slate-300">See you tomorrow!</strong></p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in-up">
      {/* Header Card */}
      <div className="bg-alvoun-blue text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Navigation className="h-24 w-24" />
        </div>
        <div className="relative z-10">
          <h1 className="text-lg font-medium opacity-90">{greeting},</h1>
          <p className="text-2xl font-bold tracking-tight mb-4">{session?.user?.name}</p>
          
          <div className="inline-flex items-center bg-white dark:bg-slate-950/20 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm border border-white dark:border-slate-950/10">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
            </span>
            Active Shift (07:00 - 19:00)
          </div>
        </div>
      </div>

      {/* Primary Action */}
      <Link href="/dashboard/salesman/customers" className="block bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-alvoun-light rounded-xl flex items-center justify-center text-alvoun-blue shrink-0">
            <Navigation className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">My Route</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">View and visit assigned customers</p>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 pr-2">
            {formatNumber(stats?.customersCount || 0)}
          </div>
        </div>
      </Link>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-5 w-5 text-alvoun-green" />
            <span className="text-sm font-medium">Visited Today</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {formatNumber(stats?.visitsCount || 0)}
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400">
            <MapPin className="h-5 w-5 text-alvoun-blue" />
            <span className="text-sm font-medium">Assigned Routes</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
             {formatNumber(stats?.routesCount || 0)}
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400">
            <MapIcon className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-medium">Assigned Areas</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatNumber(stats?.areasCount || 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400">
            <IndianRupee className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium">Collected Today</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
             {formatMoney(stats?.collectionAmount || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
