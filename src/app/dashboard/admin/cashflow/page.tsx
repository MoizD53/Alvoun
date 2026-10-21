import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { isFinancialRole } from '@/lib/rbac';
import { getCashFlowData } from '@/lib/actions/admin/cashflow';
import CashFlowClient from './CashFlowClient';

export const dynamic = 'force-dynamic';

export default async function CashFlowPage(props: {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    redirect('/dashboard');
  }

  const searchParams = await props.searchParams;
  const period = (searchParams.period as any) || 'today';

  const data = await getCashFlowData({
    period,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
  });

  return (
    <CashFlowClient
      initialData={data}
      currentPeriod={period}
    />
  );
}
