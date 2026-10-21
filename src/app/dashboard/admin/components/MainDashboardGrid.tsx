'use client';

import React, { useState, useTransition } from 'react';
import TopCustomersCard from './TopCustomersCard';
import SalesTrendChart from './SalesTrendChart';
import AreaWiseSalesCard from './AreaWiseSalesCard';
import ProductSalesDonut from './ProductSalesDonut';
import type { 
  TopCustomerItem, 
  TrendPoint, 
  AreaSaleItem, 
  ProductSalesData 
} from '@/lib/dashboard-data';
import { fetchProductSales } from '../actions/dashboard-data';

interface MainDashboardGridProps {
  topCustomers: TopCustomerItem[];
  trendPoints: TrendPoint[];
  areaSales: AreaSaleItem[];
  initialProductSales: ProductSalesData;
  selectedDate: string;
  isToday?: boolean;
}

export default function MainDashboardGrid({
  topCustomers,
  trendPoints,
  areaSales,
  initialProductSales,
  selectedDate,
  isToday = true,
}: MainDashboardGridProps) {
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
    <div className="space-y-4 sm:space-y-5">
      {/* ROW 1: TOP 10 CUSTOMERS <--> SALES TREND (EXACTLY MATCHING SKETCH) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="flex flex-col min-h-[340px]">
          <TopCustomersCard
            topCustomers={topCustomers}
            selectedDate={selectedDate}
            isToday={isToday}
          />
        </div>
        <div className="flex flex-col min-h-[340px]">
          <SalesTrendChart
            initialPoints={trendPoints}
            selectedDate={selectedDate}
            activeDateKey={activeDateKey}
            onSelectDate={handleSelectDate}
          />
        </div>
      </div>

      {/* ROW 2: AREA-WISE SALES <--> SALES BY PRODUCT (EXACTLY MATCHING SKETCH) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="flex flex-col min-h-[340px]">
          <AreaWiseSalesCard 
            areaSales={areaSales} 
            selectedDate={selectedDate}
            isToday={isToday}
          />
        </div>
        <div className="flex flex-col min-h-[340px]">
          <ProductSalesDonut
            productSales={productSales}
            selectedDate={selectedDate}
            selectedDateLabel={activeDateLabel}
            isDateOverridden={isOverridden}
            onResetDate={handleReset}
            isLoading={isPending}
          />
        </div>
      </div>
    </div>
  );
}
