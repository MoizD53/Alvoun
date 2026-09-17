require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

async function createRoutes() {
  const libsql = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const adapter = new PrismaLibSQL(libsql);
  const prisma = new PrismaClient({ adapter });

  console.log('Fetching cities...');
  const dahod = await prisma.city.findFirst({ where: { name: 'Dahod' } });
  const katwara = await prisma.city.findFirst({ where: { name: 'Katwara' } });

  console.log('Fetching salesmen...');
  const s1 = await prisma.salesman.findFirst({ where: { name: 'Salesman 1' } });
  const s2 = await prisma.salesman.findFirst({ where: { name: 'Salesman 2' } });
  const s3 = await prisma.salesman.findFirst({ where: { name: 'Salesman 3' } });

  console.log('Creating routes...');
  
  if (dahod) {
    await prisma.route.create({ data: { name: 'Dahod North', cityId: dahod.id, salesmanId: s1?.id } });
    await prisma.route.create({ data: { name: 'Dahod South', cityId: dahod.id, salesmanId: s2?.id } });
    await prisma.route.create({ data: { name: 'Dahod Central', cityId: dahod.id } }); // unassigned
  }
  
  if (katwara) {
    await prisma.route.create({ data: { name: 'Katwara Main', cityId: katwara.id, salesmanId: s3?.id } });
    await prisma.route.create({ data: { name: 'Katwara East', cityId: katwara.id } }); // unassigned
  }

  console.log('Done.');
}
createRoutes().catch(console.error);
