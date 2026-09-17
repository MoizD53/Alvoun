import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('password123', 10)
  
  await prisma.profile.upsert({
    where: { email: 'owner@alvoun.com' },
    update: {},
    create: {
      name: 'Owner',
      email: 'owner@alvoun.com',
      password,
      role: 'OWNER'
    },
  })
  
  await prisma.profile.upsert({
    where: { email: 'admin@alvoun.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@alvoun.com',
      password,
      role: 'ADMIN'
    },
  })
  
  const salesmanProfile = await prisma.profile.upsert({
    where: { email: 'salesman@alvoun.com' },
    update: {},
    create: {
      name: 'Salesman User',
      email: 'salesman@alvoun.com',
      password,
      role: 'SALESMAN'
    },
  })

  await prisma.salesman.upsert({
    where: { profileId: salesmanProfile.id },
    update: {},
    create: {
      profileId: salesmanProfile.id,
      employeeCode: 'EMP001',
      name: 'Salesman User',
      phone: '1234567890'
    }
  })

  // Seed Products
  const prod1L = await prisma.product.upsert({
    where: { name: '1 Litre' },
    update: {},
    create: { name: '1 Litre', bottlesPerCrate: 12 }
  })
  const prod500ml = await prisma.product.upsert({
    where: { name: '500 ml' },
    update: {},
    create: { name: '500 ml', bottlesPerCrate: 24 }
  })
  const prod250ml = await prisma.product.upsert({
    where: { name: '250 ml' },
    update: {},
    create: { name: '250 ml', bottlesPerCrate: 48 }
  })

  // Seed standard rates (1 Litre = ₹90, 500 ml = ₹110, 250 ml = ₹80)
  // Ensure we have a base rate (minQuantity: 0)
  await prisma.rate.createMany({
    data: [
      { productId: prod1L.id, minQuantity: 0, rate: 9000 },
      { productId: prod500ml.id, minQuantity: 0, rate: 11000 },
      { productId: prod250ml.id, minQuantity: 0, rate: 8000 }
    ]
  }).catch(() => console.log('Rates already exist or error seeding rates'))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
