export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { 
  getKolkataMonthBoundaries, 
  getKolkataStartOfDay, 
  getKolkataEndOfDay, 
  getCurrentKolkataTime,
  getKolkataDateString 
} from '@/lib/time';
import { calculateOutstanding } from '@/lib/outstanding';

function sanitizeCell(val: any): any {
  if (typeof val === 'string') {
    if (['=', '+', '-', '@'].some(char => val.startsWith(char))) {
      return `'${val}`;
    }
  }
  return val;
}

function sanitizeRows(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map(row => {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      clean[k] = sanitizeCell(v);
    }
    return clean;
  });
}

export async function GET(request: Request) {
  const xlsx = await import('xlsx');
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const role = (session.user as any).role;
  const allowedRoles = ['OWNER', 'ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT'];
  if (!allowedRoles.includes(role)) {
    return new NextResponse('Forbidden: Insufficient privileges', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'daily';
  const format = (searchParams.get('format') || 'xlsx').toLowerCase();

  let rawData: Record<string, any>[] = [];
  let sheetName = 'Export';
  let fileBaseName = `alvoun_${type}_${Date.now()}`;

  const now = getCurrentKolkataTime();
  const todayStr = getKolkataDateString(now);
  const fromDate = searchParams.get('from') || searchParams.get('date') || todayStr;
  const toDate = searchParams.get('to') || fromDate;

  const start = getKolkataStartOfDay(fromDate);
  const end = getKolkataEndOfDay(toDate);

  try {
    if (type === 'daily' || type === 'sales') {
      const sales = await prisma.sale.findMany({
        where: { saleDate: { gte: start, lte: end } },
        include: { 
          customer: { include: { route: true, area: true } }, 
          salesman: true,
          items: { include: { product: true } }
        },
        orderBy: { saleDate: 'asc' }
      });

      sales.forEach(sale => {
        sale.items.forEach(item => {
          rawData.push({
            'Invoice Date': sale.saleDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
            'Customer Name': sale.customer.customerName,
            'Contact': sale.customer.contact,
            'Route': sale.customer.route?.name || 'Unassigned',
            'Area / Sector': sale.customer.area?.name || 'Unassigned',
            'Salesman': sale.salesman.name,
            'Employee Code': sale.salesman.employeeCode,
            'Product': item.product.name,
            'PKGs': item.crates,
            'Bottles': item.crates * item.product.bottlesPerCrate,
            'Standard Rate (₹)': (item.standardRate / 100).toFixed(2),
            'Actual Rate (₹)': (item.actualRate / 100).toFixed(2),
            'Rate Status': item.standardRate === item.actualRate ? 'Standard' : 'Special',
            'Total Amount (₹)': (item.amount / 100).toFixed(2),
          });
        });
      });

      sheetName = 'Sales Register';
      fileBaseName = `Sales_Register_${fromDate}_to_${toDate}`;

    } else if (type === 'collections' || type === 'payments') {
      const payments = await prisma.payment.findMany({
        where: { paymentDate: { gte: start, lte: end } },
        include: {
          customer: { include: { route: true, area: true } },
          salesman: true,
        },
        orderBy: { paymentDate: 'asc' }
      });

      payments.forEach(pay => {
        rawData.push({
          'Payment Date': pay.paymentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          'Customer Name': pay.customer.customerName,
          'Route': pay.customer.route?.name || 'Unassigned',
          'Area': pay.customer.area?.name || 'Unassigned',
          'Salesman': pay.salesman.name,
          'Amount (₹)': (pay.amount / 100).toFixed(2),
          'Payment Method': pay.paymentMethod,
          'Reference No': pay.referenceNumber || 'N/A',
        });
      });

      sheetName = 'Collections';
      fileBaseName = `Collections_${fromDate}_to_${toDate}`;

    } else if (type === 'outstanding' || type === 'dues') {
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
        },
        orderBy: { customerName: 'asc' }
      });

      customers.forEach(c => {
        const outstanding = calculateOutstanding(c);
        if (outstandingOnly && outstanding <= 0) return;

        const totalSales = c.sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPayments = c.payments.reduce((sum, p) => sum + p.amount, 0);

        rawData.push({
          'Customer ID': c.id,
          'Customer Name': c.customerName,
          'Contact': c.contact,
          'Address': c.address,
          'State': c.state?.name || 'Gujarat',
          'City': c.city?.name || 'Dahod',
          'Route': c.route?.name || 'Unassigned',
          'Salesman': c.salesman?.name || 'Unassigned',
          'Opening Balance (₹)': ((c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance) / 100).toFixed(2),
          'Lifetime Sales (₹)': (totalSales / 100).toFixed(2),
          'Lifetime Collections (₹)': (totalPayments / 100).toFixed(2),
          'Outstanding Balance (₹)': (outstanding / 100).toFixed(2),
          'Status': outstanding > 0 ? 'Due (Debit)' : outstanding < 0 ? 'Advance (Credit)' : 'Settled',
        });
      });

      sheetName = 'Market Outstanding';
      fileBaseName = `Customer_Outstanding_${todayStr}`;

    } else if (type === 'customers') {
      const customers = await prisma.customer.findMany({
        include: {
          salesman: true,
          route: true,
          area: true,
          city: true,
          state: true,
          sales: { select: { totalAmount: true } },
          payments: { select: { amount: true } },
        },
        orderBy: { customerName: 'asc' }
      });

      customers.forEach(c => {
        const outstanding = calculateOutstanding(c);
        rawData.push({
          'Customer ID': c.id,
          'Customer Name': c.customerName,
          'Contact': c.contact,
          'Address': c.address,
          'Route': c.route?.name || 'Unassigned',
          'Area': c.area?.name || 'Unassigned',
          'City': c.city?.name || 'Dahod',
          'State': c.state?.name || 'Gujarat',
          'Salesman': c.salesman?.name || 'Unassigned',
          'Status': c.status,
          'Opening Balance (₹)': ((c.openingBalanceType === 'DEBIT' ? c.openingBalance : -c.openingBalance) / 100).toFixed(2),
          'Outstanding (₹)': (outstanding / 100).toFixed(2),
          'Created Date': c.createdAt.toISOString().split('T')[0],
        });
      });

      sheetName = 'Customer Master';
      fileBaseName = `Customer_Master_${todayStr}`;

    } else if (type === 'products') {
      const [products, saleItems] = await Promise.all([
        prisma.product.findMany({ orderBy: { bottlesPerCrate: 'asc' } }),
        prisma.saleItem.findMany({
          where: { sale: { saleDate: { gte: start, lte: end } } }
        })
      ]);

      products.forEach(p => {
        const items = saleItems.filter(i => i.productId === p.id);
        const crates = items.reduce((sum, i) => sum + i.crates, 0);
        const amount = items.reduce((sum, i) => sum + i.amount, 0);

        rawData.push({
          'Product SKU': p.id,
          'Product Name': p.name,
          'Packaging (Bottles/Crate)': p.bottlesPerCrate,
          'PKGs Dispatched': crates,
          'Bottles Dispatched': crates * p.bottlesPerCrate,
          'Gross Revenue (₹)': (amount / 100).toFixed(2),
          'Status': p.isActive ? 'Active' : 'Inactive',
        });
      });

      sheetName = 'Product Dispatches';
      fileBaseName = `Product_Dispatches_${fromDate}_to_${toDate}`;

    } else if (type === 'attendance' || type === 'sessions') {
      const sessions = await prisma.workSession.findMany({
        where: { workDate: { gte: start, lte: end } },
        include: { salesman: true },
        orderBy: { workDate: 'desc' }
      });

      sessions.forEach(sess => {
        const loginStr = sess.loginAt ? sess.loginAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
        const logoutStr = sess.logoutAt ? sess.logoutAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'In Field';
        rawData.push({
          'Work Date': sess.workDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          'Employee Code': sess.salesman.employeeCode,
          'Sales Staff Name': sess.salesman.name,
          'Phone': sess.salesman.phone,
          'Login Time': loginStr,
          'Logout Time': logoutStr,
          'Session Status': sess.status,
        });
      });

      sheetName = 'Attendance';
      fileBaseName = `Attendance_${fromDate}_to_${toDate}`;

    } else if (type === 'activity') {
      const logs = await prisma.activityLog.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { salesman: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      });

      logs.forEach(log => {
        rawData.push({
          'Timestamp': log.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          'Salesman': log.salesman.name,
          'Code': log.salesman.employeeCode,
          'Action Type': log.type,
          'Description': log.description,
        });
      });

      sheetName = 'Audit Activity';
      fileBaseName = `Activity_Log_${fromDate}_to_${toDate}`;

    } else {
      return new NextResponse(`Unsupported export type: ${type}`, { status: 400 });
    }

    if (rawData.length === 0) {
      rawData.push({ 'Status': 'No records found matching the requested period and filters.' });
    }

    // Formula injection sanitization
    const cleanData = sanitizeRows(rawData);

    const worksheet = xlsx.utils.json_to_sheet(cleanData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

    if (format === 'csv') {
      const csvOutput = xlsx.utils.sheet_to_csv(worksheet);
      return new NextResponse(csvOutput, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileBaseName}.csv"`
        }
      });
    }

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileBaseName}.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Export generation error:', error);
    return new NextResponse(`Error generating export: ${error.message}`, { status: 500 });
  }
}
