import { getSalesmenAccounts } from '@/lib/actions/admin/salesman-management';
import SalesmanList from './components/SalesmanList';

export const dynamic = 'force-dynamic';

export default async function SalesmenPage() {
  const salesmen = await getSalesmenAccounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Salesmen Accounts</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage salesman profiles and login credentials</p>
        </div>
      </div>
      
      <SalesmanList initialSalesmen={salesmen} />
    </div>
  );
}
