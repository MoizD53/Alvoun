import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPurchases } from '@/lib/actions/admin/purchase';
import PurchasesClient from './PurchasesClient';
import { isFinancialRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage(props: {
  searchParams: Promise<{ supplierId?: string; paymentStatus?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    redirect('/dashboard');
  }

  const searchParams = await props.searchParams;
  const data = await getPurchases({
    supplierId: searchParams.supplierId,
    paymentStatus: searchParams.paymentStatus,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
  });

  return (
    <div className="space-y-6">
      <PurchasesClient
        initialData={data}
        currentSupplier={searchParams.supplierId || 'ALL'}
        currentStatus={searchParams.paymentStatus || 'ALL'}
        startDate={searchParams.startDate || ''}
        endDate={searchParams.endDate || ''}
      />
    </div>
  );
}
