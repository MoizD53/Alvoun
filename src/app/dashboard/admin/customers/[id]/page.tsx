import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import CustomerWorkspace from '@/components/CustomerWorkspace';
import { auth } from '@/auth';

export default async function ViewCustomerPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const [resolvedParams, session] = await Promise.all([
    params,
    auth()
  ]);
  
  const customer = await prisma.customer.findUnique({
    where: { id: resolvedParams.id },
    include: {
      state: true,
      city: true,
      route: true,
      salesman: true,
      sales: { include: { items: { include: { product: true } } }, orderBy: { saleDate: 'desc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
      visits: { orderBy: { createdAt: 'desc' } },
      auditLogs: { 
        where: { action: { in: ['OPENING_BALANCE_UPDATED', 'OPENING_BALANCE_BULK_IMPORTED'] } },
        orderBy: { createdAt: 'desc' } 
      },
    }
  });
  
  if (!customer) notFound();

  return <CustomerWorkspace customer={customer} userRole={session?.user?.role} />;
}
