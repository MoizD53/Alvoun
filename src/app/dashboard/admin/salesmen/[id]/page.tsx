import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import SalesmanForm from '../components/SalesmanForm';
import CredentialManager from '../components/CredentialManager';

export const dynamic = 'force-dynamic';

export default async function EditSalesmanPage({ params }: { params: { id: string } }) {
  const salesman = await prisma.salesman.findUnique({
    where: { id: params.id },
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Salesman</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Edit profile, login credentials, or territory assignments for {salesman.name}</p>
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
