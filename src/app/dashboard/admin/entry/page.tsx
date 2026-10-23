import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { isFinancialRole } from '@/lib/rbac';
import { getAdminEntryWorkspaceData } from '@/lib/actions/admin/admin-entry';
import AdminEntryClient from './AdminEntryClient';

export const dynamic = 'force-dynamic';

export default async function AdminEntryPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    redirect('/dashboard');
  }

  const searchParams = await props.searchParams;
  const data = await getAdminEntryWorkspaceData(searchParams.date);

  return (
    <div className="space-y-6">
      <AdminEntryClient
        initialData={data}
        selectedDate={data.targetDate}
      />
    </div>
  );
}
