import AccessManager from './components/AccessManager';
import { getSalesmenAccess, getRoutesAndAreas } from '@/lib/actions/admin/salesman-access';

export const dynamic = 'force-dynamic';

export default async function SalesmenAccessPage() {
  const salesmenData = await getSalesmenAccess();
  const routesData = await getRoutesAndAreas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Salesman Access Management</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage territory assignments for all salesmen</p>
      </div>

      <AccessManager initialSalesmen={salesmenData} routes={routesData} />
    </div>
  );
}
