import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import SalesmanForm from '../components/SalesmanForm';
import CredentialManager from '../components/CredentialManager';
import DeleteSalesman from '../components/DeleteSalesman';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditSalesmanPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const salesman = await prisma.salesman.findUnique({
    where: { id: resolvedParams.id },
    include: {
      profile: true,
    },
  });

  if (!salesman) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/admin/salesmen" 
          className="p-2.5 bg-surface-raised shadow-raised hover:shadow-raised-sm press-active rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/40"
          aria-label="Back to Salesmen"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Manage Salesman</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Edit profile and app login credentials for <span className="font-semibold text-primary">{salesman.name}</span></p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesmanForm initialData={salesman} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <CredentialManager 
            profileId={salesman.profileId} 
            loginId={salesman.profile.email} 
            isActive={salesman.profile.isActive} 
          />
          <DeleteSalesman id={salesman.id} name={salesman.name} />
        </div>
      </div>
    </div>
  );
}
