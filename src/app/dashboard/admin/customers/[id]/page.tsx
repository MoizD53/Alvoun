import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import CustomerWorkspace from '@/components/CustomerWorkspace';

export default async function ViewCustomerPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  
  const customer = await prisma.customer.findUnique({
    where: { id: resolvedParams.id },
    include: {
      state: true,
      city: true,
      route: true,
      salesman: true,
      sales: { include: { items: true }, orderBy: { saleDate: 'desc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
      visits: { orderBy: { createdAt: 'desc' } },
    }
  });
  
  if (!customer) notFound();

  return <CustomerWorkspace customer={customer} />;
}
