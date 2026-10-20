import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDailyAttendance, getPayrollLedger, getStaffDirectory } from '@/lib/actions/admin/payroll';
import PayrollClient from './PayrollClient';
import { getCurrentKolkataTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function PayrollPage(props: {
  searchParams: Promise<{ date?: string; month?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    redirect('/dashboard');
  }

  const searchParams = await props.searchParams;
  const now = getCurrentKolkataTime();
  const dateStr = searchParams.date || now.toISOString().split('T')[0];
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  const [staffList, attendanceData, ledgerData] = await Promise.all([
    getStaffDirectory(),
    getDailyAttendance(dateStr),
    getPayrollLedger(month, year),
  ]);

  return (
    <div className="space-y-6">
      <PayrollClient
        staffList={staffList}
        attendanceData={attendanceData}
        ledgerData={ledgerData.ledger}
        currentDate={dateStr}
        currentMonth={month}
        currentYear={year}
      />
    </div>
  );
}
