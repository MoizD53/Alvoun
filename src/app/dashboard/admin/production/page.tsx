import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getProductionBatches } from '@/lib/actions/admin/production';
import ProductionClient from './ProductionClient';
import { isFinancialRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function ProductionPage(props: {
  searchParams: Promise<{ productId?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    redirect('/dashboard');
  }

  const searchParams = await props.searchParams;
  const data = await getProductionBatches({
    productId: searchParams.productId,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
  });

  return (
    <div className="space-y-6">
      <ProductionClient
        initialData={data}
        currentProduct={searchParams.productId || 'ALL'}
        startDate={searchParams.startDate || ''}
        endDate={searchParams.endDate || ''}
      />
    </div>
  );
}
