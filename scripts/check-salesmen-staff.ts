import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { prisma } from '../src/lib/db';

async function check() {
  const allSalesmen = await prisma.salesman.findMany({
    include: {
      staffMember: true,
      profile: true,
      _count: { select: { sales: true, visits: true } }
    }
  });

  console.log('All Salesmen in DB:');
  for (const s of allSalesmen) {
    console.log({
      id: s.id,
      code: s.employeeCode,
      name: s.name,
      isActive: s.isActive,
      salesCount: s._count.sales,
      visitsCount: s._count.visits,
      staff: s.staffMember ? `${s.staffMember.employeeCode} (${s.staffMember.name})` : null
    });
  }

  const allStaff = await prisma.staffMember.findMany({
    include: { salesman: true },
    orderBy: { employeeCode: 'asc' }
  });
  console.log('\nAll Staff in DB:');
  for (const st of allStaff) {
    console.log({
      id: st.id,
      code: st.employeeCode,
      name: st.name,
      salary: st.monthlySalary / 100,
      designation: st.designation,
      salesman: st.salesman ? `${st.salesman.employeeCode} (${st.salesman.name})` : null
    });
  }
}

check().catch(console.error);
