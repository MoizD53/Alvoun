import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCurrentKolkataTime, getKolkataTimeDetails } from '@/lib/time';
import { getDashboardExecutiveData } from '@/lib/dashboard-data';
import { isFinancialRole } from '@/lib/rbac';

import ExecutiveHeader from './components/ExecutiveHeader';
import ExecutiveKPIRow from './components/ExecutiveKPIRow';
import SecondaryMetricsBar from './components/SecondaryMetricsBar';
import SalesTrendChart from './components/SalesTrendChart';
import ProductSalesDonut from './components/ProductSalesDonut';
import OperationalAlertsCard from './components/OperationalAlertsCard';
import QuickActionsRail from './components/QuickActionsRail';
import LowerInformationGrid from './components/LowerInformationGrid';

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

  // Fetch complete real data via Phase 2 data layer
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

      {/* 2. PRIMARY 4-CARD KPI ROW (MATCHES REFERENCE ROW 1) */}
      <ExecutiveKPIRow
        trends={data.trends}
        dispatches={data.dispatches}
        expenses={data.expenses}
        isToday={data.isToday}
        selectedDate={data.selectedDate}
      />

      {/* 3. MAIN COCKPIT ENTERPRISE GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* LEFT / CENTER CONTENT AREA (9 COLS ON XL) */}
        <div className="xl:col-span-9 space-y-4 sm:space-y-5">
          {/* REFERENCE ROW 2: 3-PANEL ANALYTICS & SIGNALS GRID (TREND + DONUT + ALERTS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5 items-stretch">
            {/* 1. SALES TREND AREA CHART (5 COLS ON XL) */}
            <div className="md:col-span-2 xl:col-span-5 flex flex-col">
              <SalesTrendChart
                initialPoints={data.trends.points}
                selectedDate={data.selectedDate}
              />
            </div>

            {/* 2. SALES BY PRODUCT DONUT & TABLE (4 COLS ON XL) */}
            <div className="md:col-span-1 xl:col-span-4 flex flex-col">
              <ProductSalesDonut
                productSales={data.productSales}
              />
            </div>

            {/* 3. ALERTS & NOTIFICATIONS (3 COLS ON XL) */}
            <div className="md:col-span-1 xl:col-span-3 flex flex-col">
              <OperationalAlertsCard
                alerts={data.alerts}
              />
            </div>
          </div>

          {/* REFERENCE ROW 3: SECONDARY METRICS HORIZONTAL STRIP */}
          <SecondaryMetricsBar
            meta={data.meta}
            attendance={data.attendance}
          />

          {/* REFERENCE ROW 4 & 5: LOWER OPERATIONAL TABLES & MODULES */}
          <LowerInformationGrid
            topCustomers={data.topCustomers}
            areaSales={data.areaSales}
            attendance={data.attendance}
            dispatches={data.dispatches}
            isToday={data.isToday}
            selectedDate={data.selectedDate}
          />
        </div>

        {/* RIGHT RAIL: BRAND INSPIRATION + QUICK ACTIONS (3 COLS ON XL) */}
        <div className="xl:col-span-3 space-y-4 sm:space-y-5">
          <QuickActionsRail />
        </div>
      </div>
    </div>
  );
}
