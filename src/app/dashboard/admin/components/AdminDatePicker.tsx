'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminDatePicker({ 
  currentDate, 
  basePath = '/dashboard/admin' 
}: { 
  currentDate: string; 
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (newDate) {
      params.set('date', newDate);
    } else {
      params.delete('date');
    }
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <input 
      type="date" 
      defaultValue={currentDate}
      onChange={handleDateChange}
      className="text-sm border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-alvoun-blue/20 outline-none text-slate-900 dark:text-slate-100 cursor-pointer"
    />
  );
}
