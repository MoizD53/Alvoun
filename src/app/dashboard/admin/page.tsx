import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getKolkataStartOfDay, getKolkataEndOfDay } from '@/lib/time';
import { formatMoney, formatNumber } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import Link from 'next/link';

export default async function AdminDashboard({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth();

  if (!session?.user) redirect('/login');
  if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const dateStr = resolvedParams.date;
  
  const startOfDay = getKolkataStartOfDay(dateStr);
  const endOfDay = getKolkataEndOfDay(dateStr);

  const [
    sales, 
    payments, 
    visits, 
    activeWorkSessions, 
    customers,
    products
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: startOfDay, lte: endOfDay } },
      include: { salesman: true, items: true }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
      include: { salesman: true }
    }),
    prisma.visit.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      include: { salesman: true }
    }),
    prisma.workSession.findMany({
      where: { 
        workDate: { gte: startOfDay, lte: endOfDay }
      },
      include: { salesman: true }
    }),
    prisma.customer.findMany({
      include: {
        sales: { select: { totalAmount: true } },
        payments: { select: { amount: true } }
      }
    }),
    prisma.product.findMany()
  ]);

  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCollection = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = customers.reduce((sum, c) => sum + calculateOutstanding(c), 0);

  // Collection Breakdown
  const collectionBreakdown = payments.reduce((acc, p) => {
    acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  // Product Sales
  const productSalesMap = new Map();
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productSalesMap.has(item.productId)) {
        productSalesMap.set(item.productId, { crates: 0, bottles: 0, amount: 0 });
      }
      const pData = productSalesMap.get(item.productId);
      pData.crates += item.crates;
      pData.amount += item.amount;
      const product = products.find(p => p.id === item.productId);
      if (product) pData.bottles += (item.crates * product.bottlesPerCrate);
    });
  });

  // Salesman Performance
  const salesmanMap = new Map();
  const ensureSalesman = (salesman: any) => {
    if (!salesmanMap.has(salesman.id)) {
      salesmanMap.set(salesman.id, {
        name: salesman.name,
        visits: 0,
        salesAmount: 0,
        collectionAmount: 0,
        crates: 0
      });
    }
    return salesmanMap.get(salesman.id);
  };

  // Pre-fill with active work sessions for the day
  activeWorkSessions.forEach(session => ensureSalesman(session.salesman));

  visits.forEach(v => ensureSalesman(v.salesman).visits++);
  sales.forEach(s => {
    const sm = ensureSalesman(s.salesman);
    sm.salesAmount += s.totalAmount;
    s.items.forEach(i => sm.crates += i.crates);
  });
  payments.forEach(p => ensureSalesman(p.salesman).collectionAmount += p.amount);

  const salesmanPerformance = Array.from(salesmanMap.values()).sort((a, b) => b.salesAmount - a.salesAmount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
          <p className="text-slate-500 text-sm mt-1">Business performance overview</p>
        </div>
        <form className="flex items-center gap-2">
          <input 
            type="date" 
            name="date" 
            defaultValue={dateStr || startOfDay.toISOString().split('T')[0]} 
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
          />
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">Filter</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Sales</div>
          <div className="text-2xl font-bold text-alvoun-blue">{formatMoney(totalSales)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Collection</div>
          <div className="text-2xl font-bold text-green-600">{formatMoney(totalCollection)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="text-sm font-medium text-slate-500 mb-1">Business Outstanding</div>
          <div className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-500' : 'text-slate-900'}`}>{formatMoney(Math.abs(totalOutstanding))}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="text-sm font-medium text-slate-500 mb-1">Customer Visits</div>
          <div className="text-2xl font-bold text-slate-900">{formatNumber(visits.length)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="text-sm font-medium text-slate-500 mb-1">Active Salesmen</div>
          <div className="text-2xl font-bold text-slate-900">{formatNumber(activeWorkSessions.length)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Salesman Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500 bg-slate-50 border-y border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Salesman</th>
                  <th className="px-4 py-3 font-medium text-right">Visits</th>
                  <th className="px-4 py-3 font-medium text-right">Crates</th>
                  <th className="px-4 py-3 font-medium text-right">Sales</th>
                  <th className="px-4 py-3 font-medium text-right">Collection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salesmanPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No data for this date.</td>
                  </tr>
                ) : (
                  salesmanPerformance.map(sp => (
                    <tr key={sp.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{sp.name}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(sp.visits)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(sp.crates)}</td>
                      <td className="px-4 py-3 text-right font-medium text-alvoun-blue">{formatMoney(sp.salesAmount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{formatMoney(sp.collectionAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Collections Breakdown</h2>
            <div className="space-y-3">
              {Object.keys(collectionBreakdown).length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No collections today</div>
              ) : (
                Object.entries(collectionBreakdown).map(([method, amount]) => (
                  <div key={method} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-600">{method}</span>
                    <span className="font-bold text-slate-900">{formatMoney(amount as number)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Product Sales</h2>
            <div className="space-y-4">
              {productSalesMap.size === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No products sold today</div>
              ) : (
                Array.from(productSalesMap.entries()).map(([productId, data]) => {
                  const p = products.find(prod => prod.id === productId);
                  return (
                    <div key={productId} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <div className="font-bold text-slate-900">{p?.name}</div>
                        <div className="text-xs text-slate-500">{formatNumber(data.crates)} crates ({formatNumber(data.bottles)} btls)</div>
                      </div>
                      <div className="font-bold text-slate-900">{formatMoney(data.amount)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/admin/reports/daily" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
          <div className="font-bold text-slate-900">Reports</div>
          <div className="text-xs text-slate-500">View detailed reports</div>
        </Link>
        <Link href="/dashboard/admin/locations" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
          <div className="font-bold text-slate-900">Live Map</div>
          <div className="text-xs text-slate-500">Track field staff</div>
        </Link>
        <Link href="/dashboard/admin/customers" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
          <div className="font-bold text-slate-900">Customers</div>
          <div className="text-xs text-slate-500">Manage database</div>
        </Link>
        <Link href="/dashboard/admin/sessions" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
          <div className="font-bold text-slate-900">Work Sessions</div>
          <div className="text-xs text-slate-500">View staff attendance</div>
        </Link>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Master Data & Settings</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/dashboard/admin/states" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
            <div className="font-semibold text-slate-900">States</div>
            <div className="text-xs text-slate-500 mt-1">Manage States</div>
          </Link>
          <Link href="/dashboard/admin/cities" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
            <div className="font-semibold text-slate-900">Cities</div>
            <div className="text-xs text-slate-500 mt-1">Manage Cities</div>
          </Link>
          <Link href="/dashboard/admin/routes" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
            <div className="font-semibold text-slate-900">Routes</div>
            <div className="text-xs text-slate-500 mt-1">Manage Routes</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
