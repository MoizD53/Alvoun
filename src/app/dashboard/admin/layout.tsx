import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminNav from '@/components/layout/AdminNav';
import AdminLiveListener from './components/AdminLiveListener';
import { Search } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
    <div className="flex flex-col bg-background text-primary min-h-screen w-full transition-colors">
      <AdminLiveListener />
      <AdminNav user={session.user} />
      
      <div className="flex flex-col flex-1 w-full min-w-0 lg:pl-64">
        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
