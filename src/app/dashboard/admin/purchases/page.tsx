import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPurchases } from '@/lib/actions/admin/purchase';
import PurchasesClient from './PurchasesClient';
import { isFinancialRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage(props: {
  searchParams?: Promise<{ supplierId?: string; paymentStatus?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    redirect('/dashboard');
  }

  let resolvedParams: { supplierId?: string; paymentStatus?: string; startDate?: string; endDate?: string } = {};
  try {
    if (props?.searchParams) {
      resolvedParams = (await props.searchParams) || {};
    }
  } catch (err) {
    console.warn('[PurchasesPage] Failed to resolve searchParams:', err);
    resolvedParams = {};
  }

  const defaultData: any = {
    purchases: [],
    suppliers: [],
    rawMaterials: [],
    payments: [],
    summary: {
      totalPurchaseValuePaise: 0,
      paymentsMadePaise: 0,
      outstandingPayablesPaise: 0,
      purchasesCount: 0,
      itemsPurchasedCount: 0,
      suppliersCount: 0,
      activeSuppliersCount: 0,
      suppliersServedCount: 0,
    },
    rawMaterialPurchases: [],
  };

  let data: any = defaultData;
  try {
    data = await getPurchases({
      supplierId: resolvedParams.supplierId,
      paymentStatus: resolvedParams.paymentStatus,
      startDate: resolvedParams.startDate,
      endDate: resolvedParams.endDate,
    });
  } catch (err) {
    console.error('[PurchasesPage data fetch error]:', err);
    try {
      // Fallback without filters
      data = await getPurchases();
    } catch (fallbackErr) {
      console.error('[PurchasesPage complete fallback]:', fallbackErr);
      data = defaultData;
    }
  }

  return (
    <div className="space-y-6">
      <PurchasesClient
        initialData={data || defaultData}
        currentSupplier={resolvedParams.supplierId || 'ALL'}
        currentStatus={resolvedParams.paymentStatus || 'ALL'}
        startDate={resolvedParams.startDate || ''}
        endDate={resolvedParams.endDate || ''}
      />
    </div>
  );
}
