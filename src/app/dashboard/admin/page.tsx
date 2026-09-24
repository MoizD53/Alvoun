import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getKolkataStartOfDay, getKolkataEndOfDay } from '@/lib/time';
import { formatMoney, formatNumber } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import Link from 'next/link';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  MapPin, 
  AlertCircle, 
  Users, 
  Box, 
  Map as MapIcon, 
  Plus, 
  ChevronRight,
  UserPlus,
  FileDown
} from 'lucide-react';
import AdminCharts from './components/AdminCharts';
import LiveDashboardManager from './components/LiveDashboardManager';

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

  // Fetch today's data
  const [sales, payments, visits, activeWorkSessions, products] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: startOfDay, lte: endOfDay } },
      include: { items: true }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma.visit.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma.workSession.findMany({
      where: { 
        workDate: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        salesman: {
          include: { profile: true }
        }
      }
    }),
    prisma.product.findMany()
  ]);

  // Aggregate Metrics
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalCollection = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  const allCustomers = await prisma.customer.findMany({
    include: { sales: { include: { items: true } }, payments: true }
  });

  // Calculate global outstanding
  let totalOutstanding = 0;
  let outstandingCustomersCount = 0;
  for (const c of allCustomers) {
    const out = calculateOutstanding(c as any);
    totalOutstanding += out;
    if (out > 0) outstandingCustomersCount++;
  }

  // Salesman Performance Map
  const salesmanData = new Map<string, any>();
  activeWorkSessions.forEach(ws => {
    salesmanData.set(ws.salesmanId, {
      id: ws.salesmanId,
      name: ws.salesman.name,
      status: ws.logoutAt ? 'Completed' : 'Working',
      visits: 0,
      sales: 0,
      collection: 0,
      currentCustomer: null,
      currentAction: ws.logoutAt ? 'Offline' : 'Online'
    });
  });

  visits.forEach(v => {
    if (salesmanData.has(v.salesmanId)) {
      salesmanData.get(v.salesmanId).visits++;
    }
  });

  // Fetch currently active visits
  const activeVisits = await prisma.visit.findMany({
    where: { 
      status: 'STARTED',
      salesmanId: { in: Array.from(salesmanData.keys()) }
    },
    include: { customer: { include: { area: true, route: true } } }
  });

  activeVisits.forEach(v => {
    if (salesmanData.has(v.salesmanId)) {
      salesmanData.get(v.salesmanId).currentCustomer = v.customer;
      salesmanData.get(v.salesmanId).currentAction = 'At Customer Visit';
    }
  });

  sales.forEach(s => {
    if (salesmanData.has(s.salesmanId)) {
      salesmanData.get(s.salesmanId).sales += s.totalAmount;
    }
  });

  payments.forEach(p => {
    if (salesmanData.has(p.salesmanId)) {
      salesmanData.get(p.salesmanId).collection += p.amount;
    }
  });

  const salesmanPerformance = Array.from(salesmanData.values());

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Good morning, {session.user.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Here is what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            defaultValue={startOfDay.toISOString().split('T')[0]}
            className="text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-alvoun-blue/20 outline-none"
          />
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">TOTAL SALES</h3>
            <div className="h-8 w-8 rounded-full bg-alvoun-light flex items-center justify-center text-alvoun-blue">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{formatMoney(totalSales)}</div>
            <div className="text-xs font-medium text-alvoun-green mt-2 flex items-center">
              Today's Volume
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">COLLECTION</h3>
            <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-alvoun-green">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{formatMoney(totalCollection)}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center">
              Received Today
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">OUTSTANDING</h3>
            <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center text-alvoun-amber">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{formatMoney(totalOutstanding)}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center">
              Across Market
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">VISITS</h3>
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{formatNumber(visits.length)}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center">
              Customers Visited Today
            </div>
          </div>
        </div>
      </div>

      {/* Route & Area Coverage Charts */}
      <AdminCharts />

      <div className="w-full space-y-8">
        {/* Salesman Activity Table */}
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Salesman Activity</h2>
            <Link href="/dashboard/admin/locations" className="text-sm font-medium text-alvoun-blue hover:underline">
              View Map
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Salesman</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Current Activity</th>
                  <th className="px-6 py-3 text-right">Sales</th>
                  <th className="px-6 py-3 text-right">Collection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salesmanPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      No field staff active today.
                    </td>
                  </tr>
                ) : (
                  salesmanPerformance.map((sp: any) => (
                    <tr key={sp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{sp.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${sp.status === 'Working' ? 'bg-green-50 dark:bg-green-900/20 text-alvoun-green' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sp.status === 'Working' ? 'bg-alvoun-green' : 'bg-slate-400'}`}></span>
                          {sp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{sp.currentAction}</div>
                        {sp.currentCustomer && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {sp.currentCustomer.customerName} ({sp.currentCustomer.area?.name})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatMoney(sp.sales)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatMoney(sp.collection)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
