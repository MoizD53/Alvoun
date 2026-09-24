import { prisma } from '@/lib/db';
import SalesmanForm from '../components/SalesmanForm';

export const dynamic = 'force-dynamic';

export default async function NewSalesmanPage() {
  const routes = await prisma.route.findMany({
    include: {
      city: true,
      areas: {
        include: {
          _count: {
            select: { customers: true }
          }
        },
        orderBy: { name: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add Salesman</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Create a new salesman profile, login credentials, and assign routes & areas</p>
      </div>
      
      <SalesmanForm routes={routes} />
    </div>
  );
}
