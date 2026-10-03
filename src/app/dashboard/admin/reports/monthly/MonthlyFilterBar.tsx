'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function MonthlyFilterBar({
  year,
  month,
}: {
  year: number;
  month?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/admin/reports/monthly?${params.toString()}`);
  };

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-1.5 px-2">
        <span className="text-xs font-semibold text-slate-400">Month</span>
        <select 
          value={month || 'all'}
          onChange={(e) => updateParam('month', e.target.value)}
          className="text-xs bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
        >
          {months.map(m => (
            <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>

      <div className="flex items-center gap-1.5 px-2">
        <span className="text-xs font-semibold text-slate-400">Year</span>
        <input 
          type="number" 
          defaultValue={year}
          onChange={(e) => {
            const val = e.target.value;
            if (val && val.length === 4) {
              updateParam('year', val);
            }
          }}
          className="w-16 text-xs bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 dark:text-slate-100 font-medium cursor-pointer" 
        />
      </div>
    </div>
  );
}
