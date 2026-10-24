export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { getBudgetStatus } from '@/lib/turso-budget';
import { isFinancialRole } from '@/lib/rbac';

export async function GET() {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const budget = getBudgetStatus();
  return NextResponse.json(budget);
}
