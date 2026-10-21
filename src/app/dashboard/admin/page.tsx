import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCurrentKolkataTime, getKolkataTimeDetails } from '@/lib/time';
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

  const resolvedParams = await searchParams;
  const dateStr = resolvedParams.date;

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
  const data = await getDashboardExecutiveData(dateStr);

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

      {/* 2. TOP KPI CARDS (6 CARDS: SALES, RECEIVABLES, CASH FLOW, EXPENSES, PRODUCTION, STOCK) */}
      <ExecutiveKPIRow
        trends={data.trends}
        expenses={data.expenses}
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
