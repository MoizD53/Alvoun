'use server';

import {
  getDashboardExecutiveData,
  getSalesAndCollectionTrends,
  getProductWiseSales,
  getTopCustomers,
  getAreaWiseSales,
  getAttendanceAndFieldActivity,
  getOperationalAlerts,
  getInventoryAndDispatches,
  type DashboardExecutiveData,
  type SalesTrendsData,
  type ProductSalesData,
  type TopCustomerItem,
  type AreaSaleItem,
  type AttendanceData,
  type OperationalAlert,
  type DispatchSummary,
} from '@/lib/dashboard-data';
import { getKolkataStartOfDay, getKolkataEndOfDay } from '@/lib/time';
import { requireAdminSession } from '@/lib/session';

/**
 * Server action to fetch complete executive dashboard data
 */
export async function fetchDashboardData(dateStr?: string): Promise<DashboardExecutiveData> {
  await requireAdminSession();
  return await getDashboardExecutiveData(dateStr);
}

/**
 * Server action to fetch sales trends for a date and period (7D, 30D, 90D)
 */
export async function fetchSalesTrends(dateStr?: string, daysCount: number = 7): Promise<SalesTrendsData> {
  await requireAdminSession();
  const { trends } = await getSalesAndCollectionTrends(dateStr, daysCount);
  return trends;
}

/**
 * Server action to fetch product-wise sales breakdown
 */
export async function fetchProductSales(dateStr?: string): Promise<ProductSalesData> {
  await requireAdminSession();
  const start = getKolkataStartOfDay(dateStr);
  const end = getKolkataEndOfDay(dateStr);
  return await getProductWiseSales(start, end);
}

/**
 * Server action to fetch top customers with live outstandings
 */
export async function fetchTopCustomers(dateStr?: string, limit: number = 5): Promise<TopCustomerItem[]> {
  await requireAdminSession();
  const start = getKolkataStartOfDay(dateStr);
  const end = getKolkataEndOfDay(dateStr);
  return await getTopCustomers(start, end, limit);
}

/**
 * Server action to fetch area-wise sales distribution
 */
export async function fetchAreaSales(dateStr?: string): Promise<AreaSaleItem[]> {
  await requireAdminSession();
  const start = getKolkataStartOfDay(dateStr);
  const end = getKolkataEndOfDay(dateStr);
  return await getAreaWiseSales(start, end);
}

/**
 * Server action to fetch staff attendance & field activity
 */
export async function fetchAttendance(dateStr?: string): Promise<AttendanceData> {
  await requireAdminSession();
  const start = getKolkataStartOfDay(dateStr);
  const end = getKolkataEndOfDay(dateStr);
  return await getAttendanceAndFieldActivity(start, end);
}

/**
 * Server action to fetch operational alerts
 */
export async function fetchAlerts(dateStr?: string): Promise<OperationalAlert[]> {
  await requireAdminSession();
  const start = getKolkataStartOfDay(dateStr);
  const end = getKolkataEndOfDay(dateStr);
  return await getOperationalAlerts(start, end, true);
}

/**
 * Server action to fetch inventory and dispatches
 */
export async function fetchDispatches(dateStr?: string): Promise<DispatchSummary> {
  await requireAdminSession();
  const start = getKolkataStartOfDay(dateStr);
  const end = getKolkataEndOfDay(dateStr);
  return await getInventoryAndDispatches(start, end);
}
