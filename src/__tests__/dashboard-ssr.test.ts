import { describe, it, expect } from 'vitest';
import { getDashboardExecutiveData } from '@/lib/dashboard-data';

describe('Admin Dashboard SSR Data and Error #441 Prevention', () => {
  it('loads executive dashboard dataset without throwing', async () => {
    const data = await getDashboardExecutiveData();
    expect(data).toBeDefined();
    expect(data.purchase).toBeDefined();
    expect(data.trends).toBeDefined();
    expect(typeof data.purchase.todayQuantity).toBe('number');
    expect(typeof data.purchase.todayTotalAmountPaise).toBe('number');
  });

  it('safely handles date strings', async () => {
    const data = await getDashboardExecutiveData('2026-10-23');
    expect(data.selectedDate).toBe('2026-10-23');
  });
});
