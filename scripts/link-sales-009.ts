import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { prisma } from '../src/lib/db';

async function linkSales009() {
  const sales009 = await prisma.salesman.findUnique({
    where: { employeeCode: 'SALES-009' },
    include: { staffMember: true }
  });

  if (!sales009) {
    console.log('SALES-009 not found');
    return;
  }

  if (sales009.staffMember) {
    console.log(`SALES-009 already linked to ${sales009.staffMember.employeeCode} (${sales009.staffMember.name})`);
    return;
  }

  // Check if EMP-012 exists
  let staff = await prisma.staffMember.findUnique({
    where: { employeeCode: 'EMP-012' }
  });

  if (!staff) {
    staff = await prisma.staffMember.create({
      data: {
        employeeCode: 'EMP-012',
        name: 'Alvoun Delivery',
        designation: 'Delivery Representative',
        role: 'SALESMAN',
        monthlySalary: 1000000, // ₹10,000
        phone: sales009.phone || '9876543210',
        salesmanId: sales009.id,
        isActive: true,
      }
    });
    console.log('Created EMP-012 for SALES-009');
  } else {
    staff = await prisma.staffMember.update({
      where: { id: staff.id },
      data: {
        salesmanId: sales009.id,
        isActive: true,
      }
    });
    console.log('Updated EMP-012 linked to SALES-009');
  }
}

linkSales009().catch(console.error);
