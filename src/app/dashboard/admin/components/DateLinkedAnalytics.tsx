'use client';

import React, { useState, useTransition } from 'react';
import SalesTrendChart from './SalesTrendChart';
import ProductSalesDonut from './ProductSalesDonut';
import OperationalAlertsCard from './OperationalAlertsCard';
import type { TrendPoint, ProductSalesData, OperationalAlert } from '@/lib/dashboard-data';
import { fetchProductSales } from '../actions/dashboard-data';

interface DateLinkedAnalyticsProps {
  initialPoints: TrendPoint[];
  initialProductSales: ProductSalesData;
  alerts: OperationalAlert[];
  selectedDate: string;
}

export default function DateLinkedAnalytics({
  initialPoints,
  initialProductSales,
  alerts,
  selectedDate,
}: DateLinkedAnalyticsProps) {
  const [activeDateKey, setActiveDateKey] = useState<string>(selectedDate);
  const [activeDateLabel, setActiveDateLabel] = useState<string>('Today');
  const [isOverridden, setIsOverridden] = useState<boolean>(false);
  const [productSales, setProductSales] = useState<ProductSalesData>(initialProductSales);
  const [isPending, startTransition] = useTransition();

  const handleSelectDate = (dateKey: string, dateLabel: string) => {
    if (dateKey === selectedDate) {
      handleReset();
      return;
    }

    setActiveDateKey(dateKey);
    setActiveDateLabel(dateLabel);
    setIsOverridden(true);

    startTransition(async () => {
      try {
        const data = await fetchProductSales(dateKey);
        setProductSales(data);
      } catch (err) {
        console.error('Failed to fetch product sales for date:', err);
      }
    });
  };

  const handleReset = () => {
    setActiveDateKey(selectedDate);
    setActiveDateLabel('Today');
    setIsOverridden(false);
    setProductSales(initialProductSales);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5 items-stretch">
      {/* 1. SALES TREND AREA CHART (5 COLS ON XL) */}
      <div className="md:col-span-2 xl:col-span-5 flex flex-col">
        <SalesTrendChart
          initialPoints={initialPoints}
          selectedDate={selectedDate}
          activeDateKey={activeDateKey}
          onSelectDate={handleSelectDate}
        />
      </div>

      {/* 2. SALES BY PRODUCT DONUT & TABLE (4 COLS ON XL) - DATE-LINKED */}
      <div className="md:col-span-1 xl:col-span-4 flex flex-col">
        <ProductSalesDonut
          productSales={productSales}
          selectedDateLabel={activeDateLabel}
          isDateOverridden={isOverridden}
          onResetDate={handleReset}
          isLoading={isPending}
        />
      </div>

      {/* 3. ALERTS & NOTIFICATIONS (3 COLS ON XL) */}
      <div className="md:col-span-1 xl:col-span-3 flex flex-col">
        <OperationalAlertsCard alerts={alerts} />
      </div>
    </div>
  );
}
