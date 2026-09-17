export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import * as xlsx from 'xlsx';
import { getKolkataMonthBoundaries, getKolkataStartOfDay, getKolkataEndOfDay, getCurrentKolkataTime } from '@/lib/time';
import { calculateOutstanding } from '@/lib/outstanding';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  let data: any[] = [];
  let sheetName = 'Export';
  let fileName = `export_${Date.now()}.xlsx`;

  try {
    if (type === 'daily') {
      const year = parseInt(searchParams.get('year') || String(getCurrentKolkataTime().getFullYear()));
      const month = parseInt(searchParams.get('month') || String(getCurrentKolkataTime().getMonth() + 1));
      
      const { start, end } = getKolkataMonthBoundaries(year, month);
      
      const sales = await prisma.sale.findMany({
        where: { saleDate: { gte: start, lte: end } },
        include: { 
          customer: true, 
          salesman: true,
          items: { include: { product: true } }
        }
      });

      // Detailed daily sales dump
      sales.forEach(sale => {
        sale.items.forEach(item => {
          data.push({
            'Date': sale.saleDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
            'Customer': sale.customer.customerName,
            'Salesman': sale.salesman.name,
            'Product': item.product.name,
            'Crates': item.crates,
            'Bottles': item.crates * item.product.bottlesPerCrate,
            'Standard Rate': item.standardRate / 100,
            'Actual Rate': item.actualRate / 100,
            'Rate Type': item.standardRate === item.actualRate ? 'Standard' : 'Override',
            'Amount': item.amount / 100,
          });
        });
      });

      sheetName = 'Daily Sales';
      fileName = `Daily_Sales_${year}_${month}.xlsx`;

    } else if (type === 'outstanding') {
      const salesmanId = searchParams.get('salesmanId');
      const routeId = searchParams.get('routeId');
      const outstandingOnly = searchParams.get('outstandingOnly') !== 'false';

      const where: any = { status: 'ACTIVE' };
      if (salesmanId) where.salesmanId = salesmanId;
      if (routeId) where.routeId = routeId;

      const customers = await prisma.customer.findMany({
        where,
        include: {
          salesman: true,
          route: true,
          city: true,
          state: true,
          sales: { select: { totalAmount: true } },
          payments: { select: { amount: true } }
        }
      });

      customers.forEach(c => {
        const outstanding = calculateOutstanding(c);
        if (outstandingOnly && outstanding <= 0) return;

        const totalSales = c.sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPayments = c.payments.reduce((sum, p) => sum + p.amount, 0);

        data.push({
          'Customer': c.customerName,
          'Contact': c.contact,
          'State': c.state.name,
          'City': c.city.name,
          'Route': c.route.name,
          'Salesman': c.salesman.name,
          'Opening Balance': (c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance) / 100,
          'Total Sales': totalSales / 100,
          'Total Payments': totalPayments / 100,
          'Outstanding': outstanding / 100
        });
      });

      sheetName = 'Outstanding';
      fileName = `Customer_Outstanding.xlsx`;

    } else if (type === 'products') {
      const dateStr = searchParams.get('date') || getCurrentKolkataTime().toISOString().split('T')[0];
      const start = getKolkataStartOfDay(dateStr);
      const end = getKolkataEndOfDay(dateStr);

      const [products, saleItems] = await Promise.all([
        prisma.product.findMany(),
        prisma.saleItem.findMany({
          where: { sale: { saleDate: { gte: start, lte: end } } }
        })
      ]);

      products.forEach(p => {
        const items = saleItems.filter(i => i.productId === p.id);
        const crates = items.reduce((sum, i) => sum + i.crates, 0);
        const amount = items.reduce((sum, i) => sum + i.amount, 0);

        data.push({
          'Product': p.name,
          'Crates Sold': crates,
          'Bottles Sold': crates * p.bottlesPerCrate,
          'Sales Amount': amount / 100
        });
      });

      sheetName = 'Products';
      fileName = `Product_Sales_${dateStr}.xlsx`;
    }

    if (data.length === 0) {
      data.push({ 'Message': 'No records found for the selected filters.' });
    }

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });

  } catch (error: any) {
    return new NextResponse(`Error generating export: ${error.message}`, { status: 500 });
  }
}
