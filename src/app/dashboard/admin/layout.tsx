import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminNav from '@/components/layout/AdminNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    redirect('/dashboard');
  }

  return (
    <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen w-full transition-colors">
      <AdminNav user={session.user} />
      
      <div className="flex flex-col flex-1 w-full min-w-0 lg:pl-64">
        {/* Desktop Top Header */}
        <header className="hidden lg:flex h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 items-center justify-between px-8 transition-colors">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search customers, routes, salesmen..." 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm rounded-full pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-alvoun-blue/20 focus:border-alvoun-blue transition-colors dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Welcome, {session.user.name}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
