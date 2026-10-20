import { prisma } from '../src/lib/db';

async function enrichData() {
  console.log('[Enrichment] Starting client specification data enrichment...');

  // 1. Ensure 2 Litre product exists
  let twoLitre = await prisma.product.findUnique({ where: { name: '2 Litre' } });
  if (!twoLitre) {
    twoLitre = await prisma.product.create({
      data: {
        name: '2 Litre',
        bottlesPerCrate: 9,
        isActive: true,
      }
    });
    await prisma.rate.create({
      data: {
        productId: twoLitre.id,
        minQuantity: 0,
        rate: 36000, // ₹360 per crate (₹40/bottle)
      }
    });
    console.log('[Enrichment] ✓ Added 2 Litre product with 9 bottles/crate rate.');
  }

  // 2. Raw Materials specified in PDF:
  // - Preform (Kg/Bag) > 1 Litre, 500ml, 250ml, 2 Litre
  // - Stickers (Pcs) > 1 Litre, 500ml, 250ml, 2 Litre
  // - Cap (Pcs/Box)
  // - Shrink Roll (Kg/Nos)
  // - Ink / Make-up / Cleaner (Bottle)
  const rawMaterials = [
    { name: 'Preform - 1 Litre', category: 'PREFORM', unit: 'BAG', currentStock: 45, minReorderLevel: 10, targetProduct: '1 Litre' },
    { name: 'Preform - 500ml', category: 'PREFORM', unit: 'BAG', currentStock: 60, minReorderLevel: 15, targetProduct: '500 ml' },
    { name: 'Preform - 250ml', category: 'PREFORM', unit: 'BAG', currentStock: 40, minReorderLevel: 10, targetProduct: '250 ml' },
    { name: 'Preform - 2 Litre', category: 'PREFORM', unit: 'BAG', currentStock: 25, minReorderLevel: 5, targetProduct: '2 Litre' },
    { name: 'Stickers - 1 Litre', category: 'STICKER', unit: 'PCS', currentStock: 12000, minReorderLevel: 3000, targetProduct: '1 Litre' },
    { name: 'Stickers - 500ml', category: 'STICKER', unit: 'PCS', currentStock: 18000, minReorderLevel: 4000, targetProduct: '500 ml' },
    { name: 'Stickers - 250ml', category: 'STICKER', unit: 'PCS', currentStock: 15000, minReorderLevel: 3500, targetProduct: '250 ml' },
    { name: 'Stickers - 2 Litre', category: 'STICKER', unit: 'PCS', currentStock: 8000, minReorderLevel: 2000, targetProduct: '2 Litre' },
    { name: 'Caps - Standard Neck (28mm)', category: 'CAP', unit: 'BOX', currentStock: 85, minReorderLevel: 20, targetProduct: 'ALL' },
    { name: 'Shrink Film Roll (Packaging)', category: 'SHRINK_ROLL', unit: 'KG', currentStock: 420, minReorderLevel: 100, targetProduct: 'ALL' },
    { name: 'Batch Ink / Make-up / Cleaner', category: 'INK_CHEMICAL', unit: 'BOTTLE', currentStock: 18, minReorderLevel: 5, targetProduct: 'ALL' },
  ];

  for (const rm of rawMaterials) {
    const existing = await prisma.rawMaterial.findUnique({ where: { name: rm.name } });
    if (!existing) {
      const created = await prisma.rawMaterial.create({ data: rm });
      // Add initial stock movement
      await prisma.rawMaterialMovement.create({
        data: {
          materialId: created.id,
          type: 'INWARD',
          quantity: rm.currentStock,
          openingStock: 0,
          closingStock: rm.currentStock,
          referenceNo: 'INIT-INV',
          notes: 'Opening physical inventory setup',
        }
      });
    }
  }
  console.log('[Enrichment] ✓ Verified all client raw materials inventory items.');

  // 3. Enrich existing Customers with clean code and Category (RETAILER, DEALER, DISTRIBUTOR)
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'asc' } });
  let countUpdated = 0;
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const code = `CUST-${String(i + 1).padStart(4, '0')}`;
    let category = 'RETAILER';
    const lowerName = c.customerName.toLowerCase();
    if (lowerName.includes('agency') || lowerName.includes('distributor') || lowerName.includes('traders') || lowerName.includes('enterprise')) {
      category = 'DISTRIBUTOR';
    } else if (lowerName.includes('dealer') || lowerName.includes('wholesale') || lowerName.includes('depot') || lowerName.includes('store')) {
      category = 'DEALER';
    }

    if (!c.code || c.code !== code || c.category !== category || !c.firmName) {
      await prisma.customer.update({
        where: { id: c.id },
        data: {
          code,
          category,
          firmName: c.firmName || c.customerName,
        }
      });
      countUpdated++;
    }
  }
  console.log(`[Enrichment] ✓ Enriched ${countUpdated} customers with Customer IDs, Firm Names, and Categories.`);

  // 4. Ensure Staff members for Attendance & Payroll exist
  const staffToEnsure = [
    { employeeCode: 'EMP-001', name: 'Ramesh Patel', role: 'SALESMAN', phone: '9876543210', monthlySalary: 2500000 },
    { employeeCode: 'EMP-002', name: 'Vikram Singh', role: 'PRODUCTION_STAFF', phone: '9825123456', monthlySalary: 2200000 },
    { employeeCode: 'EMP-003', name: 'Alkesh Joshi', role: 'ACCOUNTANT', phone: '9426789123', monthlySalary: 3000000 },
    { employeeCode: 'EMP-004', name: 'Mukesh Baria', role: 'DRIVER', phone: '9712345678', monthlySalary: 1800000 },
    { employeeCode: 'EMP-005', name: 'Sanjay Rathod', role: 'LABOUR', phone: '9909876543', monthlySalary: 1500000 },
  ];

  for (const st of staffToEnsure) {
    const existing = await prisma.staffMember.findUnique({ where: { employeeCode: st.employeeCode } });
    if (!existing) {
      await prisma.staffMember.create({ data: st });
    }
  }
  console.log('[Enrichment] ✓ Verified staff members directory.');

  console.log('[Enrichment] Data enrichment completed successfully.');
  await prisma.$disconnect();
}

enrichData().catch(err => {
  console.error('[Enrichment] Error:', err);
  process.exit(1);
});
