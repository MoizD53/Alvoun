export function calculateOutstanding(customer: {
  openingBalance: number;
  openingBalanceType: string;
  sales: { totalAmount: number }[];
  payments: { amount: number }[];
}) {
  const totalSales = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalPayments = customer.payments.reduce((sum, pay) => sum + pay.amount, 0);
  
  const base = customer.openingBalanceType === 'DEBIT' 
    ? customer.openingBalance 
    : -customer.openingBalance;

  return base + totalSales - totalPayments;
}
