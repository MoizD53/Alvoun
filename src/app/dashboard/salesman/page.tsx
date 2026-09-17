import { auth } from '@/auth';
import { getDashboardStats } from '@/lib/actions/salesman/dashboard';
import Link from 'next/link';

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

  if (sessionState === 'NOT_STARTED') {
    return (
      <div className="space-y-6 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Work has not started yet.</h1>
        <p className="text-slate-500">Working hours: <br/><strong className="text-slate-700">7:00 AM – 7:00 PM</strong></p>
        <p className="text-sm text-slate-400 max-w-xs mt-4">You can access the salesman workspace and perform operations from 7:00 AM.</p>
      </div>
    );
  }

  if (sessionState === 'SESSION_ENDED') {
    return (
      <div className="space-y-6 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-2">
          <span className="text-3xl">🛑</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Work session ended.</h1>
        <p className="text-slate-500">Today's working hours: <br/><strong className="text-slate-700">7:00 AM – 7:00 PM</strong></p>
        <p className="text-sm text-slate-400 max-w-xs mt-4">Your session has ended for today. No further actions can be performed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-alvoun-blue text-white p-6 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold tracking-tight">Good Morning,</h1>
        <p className="text-xl opacity-90">{session?.user?.name}</p>
        
        <div className="mt-4 inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
          Working (07:00 AM - 07:00 PM)
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/salesman/customers" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center active:scale-95 transition-transform">
          <div className="text-3xl font-bold text-slate-900 mb-1">{stats?.customersCount}</div>
          <div className="text-sm font-medium text-slate-500">Customers</div>
        </Link>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-alvoun-blue mb-1">{stats?.visitsCount}</div>
          <div className="text-sm font-medium text-slate-500">Visited</div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center">
          <div className="text-2xl font-bold text-slate-900 mb-1">₹{((stats?.salesAmount || 0) / 100).toLocaleString()}</div>
          <div className="text-sm font-medium text-slate-500">Sales</div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center">
          <div className="text-2xl font-bold text-green-600 mb-1">₹{((stats?.collectionAmount || 0) / 100).toLocaleString()}</div>
          <div className="text-sm font-medium text-slate-500">Collection</div>
        </div>
      </div>
    </div>
  );
}
