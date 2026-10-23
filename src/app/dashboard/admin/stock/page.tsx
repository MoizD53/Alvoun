import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getStockDashboard } from '@/lib/actions/admin/stock';
import StockClient from './StockClient';
import { isFinancialRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function StockPage(props: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    redirect('/dashboard');
  }

  let resolvedParams: { date?: string } = {};
  try {
    if (props?.searchParams) {
      resolvedParams = (await props.searchParams) || {};
    }
  } catch {
    resolvedParams = {};
  }

  const dateStr = resolvedParams?.date;
  const stockData = await getStockDashboard(dateStr);

  return (
    <div className="space-y-6">
      <StockClient initialData={stockData} selectedDate={dateStr} />
    </div>
  );
}
