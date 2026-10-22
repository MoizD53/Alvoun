import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { prisma } from '../src/lib/db';

const ORIGINAL_10 = [
  { name: 'Husenkhan Pathan', salary: 30000, designation: 'Sales Representative', role: 'SALESMAN', salesmanCode: 'SALES-005' },
  { name: 'Vasim Khatri', salary: 25000, designation: 'Technical Manager', role: 'SUPERVISOR', salesmanCode: null },
  { name: 'Salimbhai Dalal', salary: 10000, designation: 'Salesman', role: 'SALESMAN', salesmanCode: 'SALES-003' },
  { name: 'Moin Shaikh', salary: 15000, designation: 'Salesman', role: 'SALESMAN', salesmanCode: 'SALES-001' },
  { name: 'Aarif Shaikh', salary: 10000, designation: 'Operator', role: 'PRODUCTION_STAFF', salesmanCode: null },
  { name: 'Sufiyan Shaikh', salary: 11000, designation: 'Associate', role: 'SALESMAN', salesmanCode: 'SALES-002' },
  { name: 'Kalpesh Mavi', salary: 11000, designation: 'Associate', role: 'SALESMAN', salesmanCode: 'SALES-008' },
  { name: 'Sonu Damor', salary: 11000, designation: 'Associate', role: 'SALESMAN', salesmanCode: 'SALES-007' },
  { name: 'Waqar Qureshi', salary: 10000, designation: 'Employee', role: 'SALESMAN', salesmanCode: 'SALES-006' },
  { name: 'Sumit Sangada', salary: 9000, designation: 'Employee', role: 'SALESMAN', salesmanCode: 'SALES-004' },
];

async function reconcile() {
  console.log('=== STARTING AUDIT & RECONCILIATION ===\n');

  // 1. Audit active salesmen
  const salesmen = await prisma.salesman.findMany({
    where: { isActive: true },
    orderBy: { employeeCode: 'asc' }
  });
  console.log(`Active salesman accounts found: ${salesmen.length}`);
  for (const s of salesmen) {
    console.log(`  - ${s.employeeCode}: ${s.name} (${s.phone || 'No phone'})`);
  }

  // 2. Audit existing staff
  const existingStaff = await prisma.staffMember.findMany({
    orderBy: { employeeCode: 'asc' },
    include: { salesman: true }
  });
  console.log(`\nExisting staff members found: ${existingStaff.length}`);
  for (const st of existingStaff) {
    console.log(`  - ${st.employeeCode}: ${st.name} | ₹${st.monthlySalary / 100} | ${st.designation || st.role} | Salesman: ${st.salesman ? st.salesman.employeeCode : 'None'}`);
  }

  // 3. Reconcile Original 10 Employees
  console.log('\n--- Reconciling Original 10 Employees ---');
  let original10SalarySum = 0;

  for (let i = 0; i < ORIGINAL_10.length; i++) {
    const orig = ORIGINAL_10[i];
    const targetCode = `EMP-${String(i + 1).padStart(3, '0')}`;
    const targetSalaryPaise = orig.salary * 100;
    original10SalarySum += orig.salary;

    // Find salesman if applicable
    let linkedSalesmanId: string | null = null;
    if (orig.salesmanCode) {
      const matchSalesman = salesmen.find(s => s.employeeCode === orig.salesmanCode);
      if (matchSalesman) {
        linkedSalesmanId = matchSalesman.id;
      }
    }

    // Find staff member by code or name
    let staffRec = existingStaff.find(s => s.employeeCode === targetCode) ||
                   existingStaff.find(s => s.name.toLowerCase().includes(orig.name.toLowerCase().split(' ')[0]) && 
                                           s.name.toLowerCase().includes(orig.name.toLowerCase().split(' ')[1] || ''));

    if (staffRec) {
      // Update with exact designation, salary, and linked salesman
      const updated = await prisma.staffMember.update({
        where: { id: staffRec.id },
        data: {
          employeeCode: targetCode,
          name: orig.name,
          designation: orig.designation,
          role: orig.role as any,
          monthlySalary: targetSalaryPaise,
          salesmanId: linkedSalesmanId,
          isActive: true,
        }
      });
      console.log(`✓ Verified & Updated ${targetCode}: ${orig.name} (₹${orig.salary}, ${orig.designation}) -> Linked: ${orig.salesmanCode || 'None'}`);
    } else {
      // Create missing staff
      const created = await prisma.staffMember.create({
        data: {
          employeeCode: targetCode,
          name: orig.name,
          designation: orig.designation,
          role: orig.role as any,
          monthlySalary: targetSalaryPaise,
          salesmanId: linkedSalesmanId,
          isActive: true,
        }
      });
      console.log(`+ Created ${targetCode}: ${orig.name} (₹${orig.salary}, ${orig.designation}) -> Linked: ${orig.salesmanCode || 'None'}`);
    }
  }

  console.log(`\nOriginal 10 commitment sum: ₹${original10SalarySum.toLocaleString('en-IN')} (Expected: ₹1,52,000)`);
  if (original10SalarySum !== 152000) {
    throw new Error(`Commitment mismatch: expected 152000, got ${original10SalarySum}`);
  }

  // 4. Check for any remaining active salesmen without a staff profile
  console.log('\n--- Checking Unlinked Active Salesmen ---');
  const allCurrentStaff = await prisma.staffMember.findMany({
    include: { salesman: true }
  });
  const linkedSalesmanIds = new Set(allCurrentStaff.map(s => s.salesmanId).filter(Boolean));

  const unlinkedSalesmen = salesmen.filter(s => !linkedSalesmanIds.has(s.id));
  console.log(`Active salesmen not in original 10: ${unlinkedSalesmen.length}`);

  let nextEmpIndex = 11;
  for (const uns of unlinkedSalesmen) {
    const nextCode = `EMP-${String(nextEmpIndex++).padStart(3, '0')}`;
    // Check if staff already exists with this salesmanId
    const existing = await prisma.staffMember.findFirst({
      where: { salesmanId: uns.id }
    });
    if (!existing) {
      const created = await prisma.staffMember.create({
        data: {
          employeeCode: nextCode,
          name: uns.name,
          designation: 'Sales Representative',
          role: 'SALESMAN',
          monthlySalary: 1000000, // standard baseline ₹10,000
          phone: uns.phone || null,
          salesmanId: uns.id,
          isActive: true,
        }
      });
      console.log(`+ Created staff profile for salesman ${uns.employeeCode} (${uns.name}): ${nextCode}`);
    } else {
      console.log(`✓ Salesman ${uns.employeeCode} already linked to ${existing.employeeCode} (${existing.name})`);
    }
  }

  // 5. Final Reconciliation Summary
  const finalStaff = await prisma.staffMember.findMany({
    where: { isActive: true },
    orderBy: { employeeCode: 'asc' },
    include: { salesman: true }
  });

  console.log('\n================ FINAL AUDIT RESULTS ================');
  console.log(`Total Unique Active Staff: ${finalStaff.length}`);
  finalStaff.forEach(s => {
    console.log(`[${s.employeeCode}] ${s.name.padEnd(20)} | ₹${(s.monthlySalary / 100).toLocaleString('en-IN').padStart(7)}/mo | ${(s.designation || s.role).padEnd(20)} | ${s.salesman ? `Salesman Account: ${s.salesman.employeeCode}` : 'Internal Staff'}`);
  });

  const orig10Final = finalStaff.filter(s => {
    const num = parseInt(s.employeeCode.replace('EMP-', ''), 10);
    return num >= 1 && num <= 10;
  });
  const orig10FinalSum = orig10Final.reduce((sum, s) => sum + s.monthlySalary, 0) / 100;

  console.log(`\nOriginal 10 Staff Count: ${orig10Final.length} / 10`);
  console.log(`Original 10 Total Salary: ₹${orig10FinalSum.toLocaleString('en-IN')}`);
  console.log('All active salesmen linked:', salesmen.every(s => finalStaff.some(st => st.salesmanId === s.id)));
  console.log('=====================================================\n');
}

reconcile().catch(err => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});
