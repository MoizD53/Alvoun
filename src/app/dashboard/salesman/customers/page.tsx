import { getMyCustomers } from '@/lib/actions/salesman/customer';
import { getProductsWithRates } from '@/lib/actions/salesman/sale';
import SalesmanCustomerList from './components/SalesmanCustomerList';

export default async function SalesmanCustomersPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search;
  const routeId = resolvedParams.routeId;
  const [customers, products] = await Promise.all([
    getMyCustomers(routeId, search),
    getProductsWithRates()
  ]);

  return (
    <SalesmanCustomerList 
      initialCustomers={customers as any}
      products={products as any}
      routeId={routeId}
    />
  );
}
