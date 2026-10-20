import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getExpenses } from '@/lib/actions/admin/expense';
import ExpensesClient from './ExpensesClient';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage(props: {
  searchParams: Promise<{ category?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    redirect('/dashboard');
  }

  const searchParams = await props.searchParams;
  const data = await getExpenses({
    category: searchParams.category,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
  });

  return (
    <div className="space-y-6">
      <ExpensesClient 
        initialData={data} 
        currentCategory={searchParams.category || 'ALL'}
        startDate={searchParams.startDate || ''}
        endDate={searchParams.endDate || ''}
      />
    </div>
  );
}
