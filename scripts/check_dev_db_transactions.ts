import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('dev.db Sale count:', await prisma.sale.count());
  console.log('dev.db SaleItem count:', await prisma.saleItem.count());
  console.log('dev.db Payment count:', await prisma.payment.count());
  console.log('dev.db Visit count:', await prisma.visit.count());
}

main().catch(console.error);
