import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const c = await prisma.customer.count();
  console.log('Total customers:', c);
}
run().finally(() => prisma.$disconnect());
