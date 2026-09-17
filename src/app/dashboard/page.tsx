import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role === 'OWNER' || session.user.role === 'ADMIN') {
    redirect('/dashboard/admin');
  } else if (session.user.role === 'SALESMAN') {
    redirect('/dashboard/salesman');
  }

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Welcome to Alvoun Dashboard</h1>
      <p className="text-slate-600 dark:text-slate-400">Day 1 foundation is working.</p>
    </div>
  );
}
