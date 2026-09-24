import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { formatMoney } from '@/lib/format';
import { IndianRupee, ShoppingCart, Package, Calendar } from 'lucide-react';
import Link from 'next/link';
import { getCurrentKolkataTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function SalesPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const resolvedParams = await searchParams;
  const session = await auth();
  if (!session?.user || session.user.role !== 'SALESMAN') {
    redirect('/login');
  }

  const salesman = await prisma.salesman.findUnique({
    where: { profileId: session.user.id }
  });
  if (!salesman) redirect('/login');

  const filter = resolvedParams.filter || 'today';
  const now = getCurrentKolkataTime();
  let startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0); // Start of today

  if (filter === 'week') {
    // Start of this week (assuming Monday start)
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); 
    startDate.setDate(diff);
  } else if (filter === 'month') {
    // Start of this month
    startDate.setDate(1);
  }

  const sales = await prisma.sale.findMany({
    where: {
      salesmanId: salesman.id,
      saleDate: {
        gte: startDate,
        lte: now
      }
    },
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: {
      saleDate: 'desc'
    }
  });

  const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalOrders = sales.length;
  const totalCrates = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.crates, 0), 0);

  return (
    <div className="space-y-6 pb-24 animate-fade-in-up">
      <div className="bg-slate-50 dark:bg-slate-900 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sales</h1>
          
          <div className="flex gap-2">
            <Link 
              href="?filter=today" 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === 'today' ? 'bg-alvoun-blue text-white' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shadow-sm'}`}
            >
              Today
            </Link>
            <Link 
              href="?filter=week" 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === 'week' ? 'bg-alvoun-blue text-white' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shadow-sm'}`}
            >
              Week
            </Link>
            <Link 
              href="?filter=month" 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === 'month' ? 'bg-alvoun-blue text-white' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shadow-sm'}`}
            >
              Month
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-gradient-to-br from-alvoun-blue to-blue-700 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-center items-center text-center">
          <div className="text-sm font-medium text-blue-100 tracking-wider mb-1">TOTAL AMOUNT</div>
          <div className="text-4xl font-black">{formatMoney(totalAmount)}</div>
        </div>
        
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-center items-center text-center shadow-sm">
          <ShoppingCart className="h-6 w-6 text-alvoun-blue mb-2" />
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalOrders}</div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Orders</div>
        </div>
        
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-center items-center text-center shadow-sm">
          <Package className="h-6 w-6 text-alvoun-blue mb-2" />
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalCrates}</div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Crates Sold</div>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-4">Recent Sales</h2>
        
        {sales.length === 0 ? (
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">No sales recorded yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
              Sales recorded during your visits will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map(sale => (
              <div key={sale.id} className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{sale.customer.customerName}</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(sale.saleDate).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="font-black text-alvoun-blue text-lg">
                    {formatMoney(sale.totalAmount)}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/30">
                  <div className="space-y-2">
                    {sale.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {item.product.name}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {item.crates} <span className="text-xs text-slate-500 font-medium">crates</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
