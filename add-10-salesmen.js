require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

async function createSalesmen() {
  const libsql = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const adapter = new PrismaLibSQL(libsql);
  const prisma = new PrismaClient({ adapter });

  console.log('Creating 10 salesmen...');
  const password = await bcrypt.hash('password123', 10);

  for (let i = 1; i <= 10; i++) {
    const email = `salesman${i}@alvoun.com`;
    const employeeCode = `EMP${(i + 1).toString().padStart(3, '0')}`;
    const name = `Salesman ${i}`;
    const phone = `98765432${i.toString().padStart(2, '0')}`;

    const profile = await prisma.profile.upsert({
      where: { email },
      update: {},
      create: { name, email, password, role: 'SALESMAN' },
    });

    await prisma.salesman.upsert({
      where: { profileId: profile.id },
      update: {},
      create: { profileId: profile.id, employeeCode, name, phone }
    });
    console.log(`Created ${name} (${email})`);
  }
  console.log('Done.');
}
createSalesmen().catch(console.error);
