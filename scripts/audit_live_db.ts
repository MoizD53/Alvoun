import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local' });
dotenv.config({ path: 'd:/alvoun/.env' });
import { prisma } from '../src/lib/db';

async function main() {
  console.log('--- DATABASE AUDIT ---');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  const customerCount = await prisma.customer.count();
  const activeCustomerCount = await prisma.customer.count({ where: { status: 'ACTIVE' } });
  const inactiveCustomerCount = await prisma.customer.count({ where: { status: { not: 'ACTIVE' } } });
  const salesCount = await prisma.sale.count();
  const paymentCount = await prisma.payment.count();
  const visitCount = await prisma.visit.count();
  const rateCount = await prisma.customerProductRate.count();
  const auditLogCount = await prisma.auditLog.count();

  console.log({
    customerCount,
    activeCustomerCount,
    inactiveCustomerCount,
    salesCount,
    paymentCount,
    visitCount,
    rateCount,
    auditLogCount,
  });

  const products = await prisma.product.findMany();
  console.log('Products:', products.map(p => ({ id: p.id, name: p.name, bottlesPerCrate: p.bottlesPerCrate, isActive: p.isActive })));

  const routes = await prisma.route.findMany({ include: { city: { include: { state: true } }, areas: true } });
  console.log('Routes in DB count:', routes.length);
  for (const r of routes) {
    console.log(`- Route "${r.name}" (ID: ${r.id}, City: ${r.city?.name}, Areas: ${r.areas.map(a => a.name).join(', ')})`);
  }

  const salesmen = await prisma.salesman.findMany({ select: { id: true, name: true, employeeCode: true, isActive: true } });
  console.log('Salesmen in DB count:', salesmen.length);
  for (const s of salesmen) {
    console.log(`- Salesman: ${s.name} (${s.employeeCode}) Active: ${s.isActive}`);
  }

  // Check sample customers
  const sampleCustomers = await prisma.customer.findMany({
    take: 5,
    include: {
      route: true,
      area: true,
      customerRates: { include: { product: true } }
    }
  });
  console.log('Sample Customers in DB:', JSON.stringify(sampleCustomers, null, 2));

  // Check customers with sales/payments
  const customersWithSales = await prisma.sale.groupBy({
    by: ['customerId'],
    _count: { id: true }
  });
  console.log('Customers with sales count:', customersWithSales.length);

  const customersWithPayments = await prisma.payment.groupBy({
    by: ['customerId'],
    _count: { id: true }
  });
  console.log('Customers with payments count:', customersWithPayments.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
