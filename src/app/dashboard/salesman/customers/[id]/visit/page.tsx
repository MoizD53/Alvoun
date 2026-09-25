import { getProductsWithRates } from '@/lib/actions/salesman/sale';
import { getCustomerDetail } from '@/lib/actions/salesman/customer';
import { notFound } from 'next/navigation';
import VisitClient from './VisitClient';

export default async function VisitPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  
  try {
    const [customer, products] = await Promise.all([
      getCustomerDetail(resolvedParams.id),
      getProductsWithRates()
    ]);
    
    return <VisitClient customer={customer} products={products} />;
  } catch (error) {
    return notFound();
  }
}
