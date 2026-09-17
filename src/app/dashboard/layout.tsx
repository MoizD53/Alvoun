import { auth, signOut } from '@/auth';
import { Droplet, LogOut } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center text-alvoun-blue">
                <Droplet className="h-8 w-8 fill-current" />
                <span className="ml-2 text-xl font-bold text-slate-900 tracking-tight">ALVOUN</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-slate-900">{session.user.name}</div>
                <div className="text-xs text-slate-500">{session.user.role}</div>
              </div>
              <form
                action={async () => {
                  'use server';
                  await signOut();
                }}
              >
                <button className="p-2 text-slate-400 hover:text-slate-500 transition-colors rounded-full hover:bg-slate-100">
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Log out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
           <nav className="flex space-x-4">
             {(session.user.role === 'OWNER' || session.user.role === 'ADMIN') && (
               <Link href="/dashboard/admin" className="text-sm font-medium text-slate-600 hover:text-alvoun-blue">Admin Dashboard</Link>
             )}
             {(session.user.role === 'SALESMAN') && (
               <Link href="/dashboard/salesman" className="text-sm font-medium text-slate-600 hover:text-alvoun-blue">Salesman View</Link>
             )}
           </nav>
        </div>
        {children}
      </div>
    </div>
  );
}
