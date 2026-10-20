import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { formatMoney } from '@/lib/format';
import { ShoppingCart, Package, Calendar } from 'lucide-react';
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
    <div className="space-y-6 pb-28 animate-fade-in-up">
      {/* Top Header & Period Filter */}
      <div className="bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Sales</h1>
          
          <div className="flex gap-1.5 bg-surface-sunken shadow-inset p-1 rounded-2xl border border-border-subtle">
            <Link 
              href="?filter=today" 
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'today' 
                  ? 'bg-brand-teal text-white shadow-raised-sm' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Today
            </Link>
            <Link 
              href="?filter=week" 
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'week' 
                  ? 'bg-brand-teal text-white shadow-raised-sm' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Week
            </Link>
            <Link 
              href="?filter=month" 
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'month' 
                  ? 'bg-brand-teal text-white shadow-raised-sm' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Month
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-linear-to-br from-brand-teal-dark via-brand-teal to-slate-900 rounded-3xl p-6 text-white shadow-raised-md flex flex-col justify-center items-center text-center">
          <div className="text-xs font-bold text-white/70 tracking-wider uppercase mb-1">TOTAL AMOUNT</div>
          <div className="text-4xl font-black tracking-tight">{formatMoney(totalAmount)}</div>
        </div>
        
        <div className="bg-surface-raised rounded-3xl border border-border-subtle p-5 flex flex-col justify-center items-center text-center shadow-raised">
          <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center mb-2 text-brand-teal">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="text-2xl font-black text-text-primary">{totalOrders}</div>
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Orders</div>
        </div>
        
        <div className="bg-surface-raised rounded-3xl border border-border-subtle p-5 flex flex-col justify-center items-center text-center shadow-raised">
          <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center mb-2 text-brand-teal">
            <Package className="h-5 w-5" />
          </div>
          <div className="text-2xl font-black text-text-primary">{totalCrates}</div>
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Crates Sold</div>
        </div>
      </div>

      {/* Recent Sales List */}
      <div>
        <h2 className="font-black text-lg text-text-primary mb-4 tracking-tight">Recent Sales</h2>
        
        {sales.length === 0 ? (
          <div className="bg-surface-raised rounded-3xl border border-border-subtle p-10 flex flex-col items-center justify-center text-center shadow-raised">
            <div className="w-16 h-16 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center mb-4 text-text-muted">
              <ShoppingCart className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-text-primary mb-1">No sales recorded yet</h3>
            <p className="text-sm text-text-secondary max-w-[220px]">
              Sales recorded during your visits will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map(sale => (
              <div 
                key={sale.id} 
                className="bg-surface-raised rounded-3xl shadow-raised hover:shadow-raised-hover border border-border-subtle overflow-hidden transition-all duration-200"
              >
                <div className="p-5 border-b border-border-subtle flex justify-between items-start">
                  <div>
                    <div className="font-black text-text-primary text-base">{sale.customer.customerName}</div>
                    <div className="text-xs font-semibold text-text-muted flex items-center gap-1.5 mt-1">
                      <Calendar className="h-3.5 w-3.5 text-brand-teal" />
                      {new Date(sale.saleDate).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="font-black text-brand-teal text-lg">
                    {formatMoney(sale.totalAmount)}
                  </div>
                </div>
                <div className="p-4 bg-surface-sunken/60">
                  <div className="space-y-2">
                    {sale.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div className="font-semibold text-text-secondary">
                          {item.product.name}
                        </div>
                        <div className="font-black text-text-primary">
                          {item.crates} <span className="text-[11px] text-text-muted font-normal">crates</span>
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
