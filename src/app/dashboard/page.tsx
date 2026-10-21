import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { isExecutiveRole, isFinancialRole } from '@/lib/rbac';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role?.toUpperCase();

  if (isExecutiveRole(role) || isFinancialRole(role) || role === 'PRODUCTION') {
    redirect('/dashboard/admin');
  } else if (role === 'SALESMAN') {
    redirect('/dashboard/salesman');
  } else {
    redirect('/dashboard/admin');
  }
}
