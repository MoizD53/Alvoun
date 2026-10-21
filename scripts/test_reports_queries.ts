import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });

async function testReports() {
  console.log('Testing Report Queries with Prisma adapter against live Turso data...');
  const { prisma } = await import('../src/lib/db');

  // 1. Monthly query for October 2026
  const start = new Date('2026-10-01T00:00:00+05:30');
  const end = new Date('2026-10-31T23:59:59+05:30');

  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: start, lte: end } },
      include: { items: true }
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end } }
    })
  ]);

  console.log('October 2026 Sales queried:', sales.length);
  console.log('October 2026 Payments queried:', payments.length);

  let octGross = 0;
  let octCrates = 0;
  for (const s of sales) {
    octGross += s.totalAmount;
    for (const item of s.items) {
      octCrates += item.crates;
    }
  }

  let octCollections = 0;
  for (const p of payments) {
    octCollections += p.amount;
  }

  console.log(`Monthly Report Result: Gross Sales = ₹${(octGross / 100).toLocaleString('en-IN')}, Crates = ${octCrates.toLocaleString('en-IN')}, Collections = ₹${(octCollections / 100).toLocaleString('en-IN')}`);

  // 2. Daily active dates
  const daysWithSales = new Set(sales.map(s => s.saleDate.toISOString().slice(0, 10)));
  console.log(`Daily Register: ${daysWithSales.size} distinct active days recorded in October.`);

  await prisma.$disconnect();
}

testReports().catch(console.error);
