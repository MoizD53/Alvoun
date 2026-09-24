import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import SalesmanForm from '../components/SalesmanForm';
import CredentialManager from '../components/CredentialManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditSalesmanPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const salesman = await prisma.salesman.findUnique({
    where: { id: resolvedParams.id },
    include: {
      profile: true,
      routes: true,
      assignments: {
        include: {
          route: true,
          area: true,
        },
      },
    },
  });

  if (!salesman) {
    notFound();
  }

  const routes = await prisma.route.findMany({
    include: {
      city: true,
      areas: {
        orderBy: { name: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/salesmen" className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Salesman</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Edit profile, login credentials, or territory assignments for {salesman.name}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesmanForm initialData={salesman} routes={routes} />
        </div>
        <div className="lg:col-span-1">
          <CredentialManager 
            profileId={salesman.profileId} 
            loginId={salesman.profile.email} 
            isActive={salesman.profile.isActive} 
          />
        </div>
      </div>
    </div>
  );
}
