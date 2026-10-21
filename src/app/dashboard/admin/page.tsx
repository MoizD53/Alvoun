import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCurrentKolkataTime, getKolkataTimeDetails } from '@/lib/time';
import { getDashboardExecutiveData } from '@/lib/dashboard-data';
import { isFinancialRole } from '@/lib/rbac';

import ExecutiveHeader from './components/ExecutiveHeader';
import ExecutiveKPIRow from './components/ExecutiveKPIRow';
import SecondaryMetricsBar from './components/SecondaryMetricsBar';
import DateLinkedAnalytics from './components/DateLinkedAnalytics';
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

      {/* 2. PRIMARY 6-CARD KPI ROW (SALES, RECEIVABLES, CASH FLOW, EXPENSES, PRODUCTION, STOCK) */}
      <ExecutiveKPIRow
        trends={data.trends}
        expenses={data.expenses}
        production={data.production}
        stock={data.stock}
        cashFlow={data.cashFlow}
        isToday={data.isToday}
        selectedDate={data.selectedDate}
      />

      {/* 3. MAIN COCKPIT ENTERPRISE GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* LEFT / CENTER CONTENT AREA (9 COLS ON XL) */}
        <div className="xl:col-span-9 space-y-4 sm:space-y-5">
          {/* REFERENCE ROW 2: DATE-LINKED ANALYTICS (SALES TREND + 3-COLOR DONUT + ALERTS) */}
          <DateLinkedAnalytics
            initialPoints={data.trends.points}
            initialProductSales={data.productSales}
            alerts={data.alerts}
            selectedDate={data.selectedDate}
          />

          {/* REFERENCE ROW 3: OPERATIONS & SECONDARY METRICS HORIZONTAL STRIP */}
          <SecondaryMetricsBar
            meta={data.meta}
            attendance={data.attendance}
            customerActivity={data.customerActivity}
            payroll={data.payroll}
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
