import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getStockDashboard } from '@/lib/actions/admin/stock';
import StockClient from './StockClient';

export const dynamic = 'force-dynamic';

export default async function StockPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    redirect('/dashboard');
  }

  const stockData = await getStockDashboard();

  return (
    <div className="space-y-6">
      <StockClient initialData={stockData} />
    </div>
  );
}
