import { getCustomerDetail } from '@/lib/actions/salesman/customer';
import { getProductsWithRates } from '@/lib/actions/salesman/sale';
import SaleWorkflow from './SaleWorkflow';
import { notFound } from 'next/navigation';

export default async function NewSalePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  
  let customer;
  try {
    customer = await getCustomerDetail(resolvedParams.id);
  } catch (error) {
    return notFound();
  }

  const products = await getProductsWithRates();

  return <SaleWorkflow customer={customer} products={products} />;
}
