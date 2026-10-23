import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCurrentKolkataTime, getKolkataTimeDetails, getKolkataDateString } from '@/lib/time';
import { getDashboardExecutiveData } from '@/lib/dashboard-data';
import { isFinancialRole } from '@/lib/rbac';

import ExecutiveHeader from './components/ExecutiveHeader';
import ExecutiveKPIRow from './components/ExecutiveKPIRow';
import MainDashboardGrid from './components/MainDashboardGrid';
import BottomOperationalStrip from './components/BottomOperationalStrip';
import QuickAccessCard from './components/QuickAccessCard';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await auth();

  if (!session?.user) redirect('/login');
  if (!isFinancialRole(session.user.role)) {
    redirect('/dashboard');
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const dateStr = resolvedParams?.date;

  // Determine time-appropriate greeting
  const now = getCurrentKolkataTime();
  const { hour } = getKolkataTimeDetails(now);

  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good evening";
  } else if (hour >= 21 || hour < 5) {
    greeting = "Good night";
  }

  // Fetch complete real data via server data layer
  let data;
  try {
    data = await getDashboardExecutiveData(dateStr);
  } catch (err) {
    console.error('[AdminDashboard Server Error during data fetch]:', err);
    try {
      data = await getDashboardExecutiveData();
    } catch {
      data = {
        selectedDate: getKolkataDateString(now),
        isToday: true,
        trends: { points: [], todaySalesPaise: 0, yesterdaySalesPaise: 0, salesChangePercent: 0, todayCollectionsPaise: 0, yesterdayCollectionsPaise: 0, collectionsChangePercent: 0, totalMarketDuesPaise: 0, todayDispatchedLitres: 0, yesterdayDispatchedLitres: 0, dispatchedLitresChangePercent: 0 },
        productSales: { products: [], totalSalesPaise: 0, totalBottles: 0, totalCrates: 0, totalLitres: 0 },
        topCustomers: [],
        areaSales: [],
        attendance: { totalStaff: 0, present: 0, working: 0, completed: 0, absent: 0, attendancePercent: 0, activeVisits: 0, completedVisits: 0, noSaleVisits: 0, totalVisitsToday: 0, salesmen: [] },
        alerts: [],
        dispatches: { totalCrates: 0, totalLooseBottles: 0, totalBottles: 0, totalLitres: 0, byProduct: [] },
        expenses: { todayExpensesPaise: 0, monthExpensesPaise: 0, expensesCount: 0 },
        production: { todayCrates: 0, todayLooseBottles: 0, todayLitres: 0, batchesCount: 0 },
        purchase: { todayTotalAmountPaise: 0, todayPaidPaise: 0, todayOutstandingPaise: 0, todayQuantity: 0, purchasesCount: 0 },
        stock: { totalAvailableCrates: 0, totalAvailableLitres: 0 },
        cashFlow: { inflowPaise: 0, outflowPaise: 0, netPaise: 0 },
        customerActivity: { totalActiveCustomers: 0, purchasedTodayCount: 0, purchasePercentage: 0 },
        payroll: { activeStaffCount: 0, monthlyLiabilityPaise: 0, paidThisMonthPaise: 0 },
        meta: { totalCustomersCount: 0, activeCustomersCount: 0, activeRoutesCount: 0, totalAreasCount: 0 }
      };
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in-up">
      {/* 1. EXECUTIVE COCKPIT HEADER */}
      <ExecutiveHeader
        userName={session.user.name || 'Niyazuddin Kazi'}
        userRole={session.user.role || 'OWNER'}
        userPhoto={session.user.image || '/niyazuddin.png'}
        selectedDate={data.selectedDate}
        greeting={greeting}
      />

      {/* 2. TOP KPI CARDS (6 CARDS: PURCHASES, SALES, RECEIVABLES, CASH FLOW, EXPENSES, STOCK) */}
      <ExecutiveKPIRow
        trends={data.trends}
        expenses={data.expenses}
        purchase={data.purchase}
        production={data.production}
        stock={data.stock}
        cashFlow={data.cashFlow}
        isToday={data.isToday}
        selectedDate={data.selectedDate}
      />

      {/* 3. MAIN DASHBOARD CONTENT (MATCHING REFERENCE SKETCH 2X2 GRID) */}
      {/* ROW 1: TOP 10 CUSTOMERS <--> SALES TREND */}
      {/* ROW 2: AREA-WISE SALES <--> SALES BY PRODUCT */}
      <MainDashboardGrid
        topCustomers={data.topCustomers}
        trendPoints={data.trends.points}
        areaSales={data.areaSales}
        initialProductSales={data.productSales}
        selectedDate={data.selectedDate}
        isToday={data.isToday}
      />

      {/* 4. BOTTOM OPERATIONAL STRIP & QUICK ACCESS (MATCHING REFERENCE SKETCH) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* LEFT: DAHOD ACTIVE CUSTOMERS & ACTIVE AREAS (8 COLS ON LG/XL) */}
        <div className="lg:col-span-8 flex flex-col">
          <BottomOperationalStrip
            activeCustomersCount={data.meta.activeCustomersCount}
            totalCustomersCount={data.meta.totalCustomersCount}
            activeAreasCount={data.meta.totalAreasCount}
            activeRoutesCount={data.meta.activeRoutesCount}
            trends={data.trends}
          />
        </div>

        {/* RIGHT: QUICK ACCESS - ADD NEW CUSTOMER, STAFF ATT., STAFF SALARY (4 COLS ON LG/XL) */}
        <div className="lg:col-span-4 flex flex-col">
          <QuickAccessCard />
        </div>
      </div>
    </div>
  );
}
