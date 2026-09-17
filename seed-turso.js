require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

async function main() {
  const libsql = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const adapter = new PrismaLibSQL(libsql);
  const prisma = new PrismaClient({ adapter });

  console.log('Seeding Turso database...');

  const password = await bcrypt.hash('password123', 10);
  
  await prisma.profile.upsert({
    where: { email: 'owner@alvoun.com' },
    update: {},
    create: { name: 'Owner', email: 'owner@alvoun.com', password, role: 'OWNER' },
  });
  
  await prisma.profile.upsert({
    where: { email: 'admin@alvoun.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@alvoun.com', password, role: 'ADMIN' },
  });
  
  const salesmanProfile = await prisma.profile.upsert({
    where: { email: 'salesman@alvoun.com' },
    update: {},
    create: { name: 'Salesman User', email: 'salesman@alvoun.com', password, role: 'SALESMAN' },
  });

  await prisma.salesman.upsert({
    where: { profileId: salesmanProfile.id },
    update: {},
    create: { profileId: salesmanProfile.id, employeeCode: 'EMP001', name: 'Salesman User', phone: '1234567890' }
  });

  const prod1L = await prisma.product.upsert({
    where: { name: '1 Litre' },
    update: {},
    create: { name: '1 Litre', bottlesPerCrate: 12 }
  });
  const prod500ml = await prisma.product.upsert({
    where: { name: '500 ml' },
    update: {},
    create: { name: '500 ml', bottlesPerCrate: 24 }
  });
  const prod250ml = await prisma.product.upsert({
    where: { name: '250 ml' },
    update: {},
    create: { name: '250 ml', bottlesPerCrate: 48 }
  });

  await prisma.rate.createMany({
    data: [
      { productId: prod1L.id, minQuantity: 0, rate: 9000 },
      { productId: prod500ml.id, minQuantity: 0, rate: 11000 },
      { productId: prod250ml.id, minQuantity: 0, rate: 8000 }
    ]
  }).catch(() => console.log('Rates already exist or error seeding rates'));

  console.log('Seeding States and Cities...');
  const gujarat = await prisma.state.upsert({ where: { name: 'Gujarat' }, update: {}, create: { name: 'Gujarat' } });
  const mp = await prisma.state.upsert({ where: { name: 'MP' }, update: {}, create: { name: 'MP' } });
  const rajasthan = await prisma.state.upsert({ where: { name: 'Rajasthan' }, update: {}, create: { name: 'Rajasthan' } });

  for (const cityName of ['Dahod', 'Katwara']) {
    const existing = await prisma.city.findFirst({ where: { name: cityName } });
    if (!existing) {
      await prisma.city.create({ data: { name: cityName, stateId: gujarat.id } });
    }
  }


  console.log('Seeding complete.');
}

main().catch(console.error);
