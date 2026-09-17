import { getCustomerDetail } from '@/lib/actions/salesman/customer';
import { notFound } from 'next/navigation';
import PaymentForm from './PaymentForm';

export default async function PaymentPage({
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

  return <PaymentForm customer={customer} />;
}
