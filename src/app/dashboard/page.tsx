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
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Welcome to Alvoun Dashboard</h1>
      <p className="text-slate-600">Day 1 foundation is working.</p>
    </div>
  );
}
