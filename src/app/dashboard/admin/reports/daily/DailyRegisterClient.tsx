'use client';

import { useState } from 'react';
import { formatMoney, formatNumber } from '@/lib/format';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

export default function DailyRegisterClient({ 
  days, 
  products, 
  fromDate, 
  toDate,
  summary 
}: { 
  days: any[], 
  products: any[], 
  fromDate: string, 
  toDate: string,
  summary: any
}) {
  const exportCsv = () => {
    // Generate CSV
    let csv = `ALVOUN Daily Sales Register\nDate Range: ${fromDate} to ${toDate}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    
    // Headers
    const headers = [
      'Date', 'Customer', 'Area', 
      ...products.map(p => `${p.name} Crates`), 
      'Total Crates', 'Sale Amount', 'Received', 'Due'
    ];
    csv += headers.join(',') + '\n';
    
    // Data
    days.forEach(day => {
      day.customers.forEach((c: any) => {
        const row = [
          day.dateStr,
          `"${c.customerName}"`,
          `"${c.areaName}"`,
          ...products.map(p => c.productQuantities[p.id] || 0),
          c.totalCrates,
          c.saleAmount / 100,
          c.receivedAmount / 100,
          c.dueAmount / 100
        ];
        csv += row.join(',') + '\n';
      });
      // Day Total
      const totalRow = [
        day.dateStr,
        '"DAY TOTAL"',
        '""',
        ...products.map(p => day.dayTotals.productQuantities[p.id] || 0),
        day.dayTotals.totalCrates,
        day.dayTotals.saleAmount / 100,
        day.dayTotals.receivedAmount / 100,
        day.dayTotals.dueAmount / 100
      ];
      csv += totalRow.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `alvoun_sales_register_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Daily Sales Register</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed operational log grouped by day.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <form className="flex w-full sm:w-auto items-center gap-2 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center px-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">From</span>
              <input 
                type="date" 
                name="from" 
                defaultValue={fromDate} 
                className="w-[120px] text-sm bg-transparent border-none focus:ring-0 focus:outline-none font-medium text-slate-900 dark:text-slate-100" 
              />
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center px-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">To</span>
              <input 
                type="date" 
                name="to" 
                defaultValue={toDate} 
                className="w-[120px] text-sm bg-transparent border-none focus:ring-0 focus:outline-none font-medium text-slate-900 dark:text-slate-100" 
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors">
              Filter
            </button>
          </form>
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-alvoun-green/10 text-alvoun-green border border-alvoun-green/20 hover:bg-alvoun-green/20 rounded-xl text-sm font-bold transition-colors whitespace-nowrap w-full sm:w-auto justify-center">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Sales</p>
          <p className="text-lg font-black text-alvoun-blue">{formatMoney(summary.salesAmount)}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Collection</p>
          <p className="text-lg font-black text-alvoun-green">{formatMoney(summary.collectionAmount)}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due from Sales</p>
          <p className="text-lg font-black text-alvoun-red">{formatMoney(summary.dueAmount)}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Crates</p>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100">{formatNumber(summary.totalCrates)}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Visits</p>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100">{formatNumber(summary.visits)}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customers</p>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100">{formatNumber(summary.uniqueCustomers)}</p>
        </div>
      </div>

      {/* Main Register */}
      {days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No sales recorded for this period.</p>
          <p className="text-slate-500">{fromDate} to {toDate}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map(day => (
            <DaySection key={day.dateStr} day={day} products={products} />
          ))}
        </div>
      )}
    </div>
  );
}

function DaySection({ day, products }: { day: any, products: any[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
            {new Date(day.dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <div className="text-base font-black text-alvoun-blue">
          {formatMoney(day.dayTotals.saleAmount)}
        </div>
      </div>

      {open && (
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Area</th>
                {products.map(p => (
                  <th key={p.id} className="px-4 py-3 text-center">{p.name}</th>
                ))}
                <th className="px-4 py-3 text-center">Total Crates</th>
                <th className="px-4 py-3 text-right">Sale Amount</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {day.customers.map((c: any) => (
                <CustomerRow key={c.customerId} customer={c} products={products} />
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-900 font-black border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              <tr>
                <td colSpan={2} className="px-4 py-4 text-xs tracking-wider uppercase text-slate-500">Day Total</td>
                {products.map(p => (
                  <td key={p.id} className="px-4 py-4 text-center">{formatNumber(day.dayTotals.productQuantities[p.id] || 0)}</td>
                ))}
                <td className="px-4 py-4 text-center">{formatNumber(day.dayTotals.totalCrates)}</td>
                <td className="px-4 py-4 text-right text-alvoun-blue">{formatMoney(day.dayTotals.saleAmount)}</td>
                <td className="px-4 py-4 text-right text-alvoun-green">{formatMoney(day.dayTotals.receivedAmount)}</td>
                <td className="px-4 py-4 text-right text-alvoun-red">{formatMoney(day.dayTotals.dueAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomerRow({ customer, products }: { customer: any, products: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasTransactions = customer.transactions && customer.transactions.length > 0;

  return (
    <>
      <tr 
        className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${hasTransactions ? 'cursor-pointer' : ''}`}
        onClick={() => hasTransactions && setExpanded(!expanded)}
      >
        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {hasTransactions && (
            expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          {customer.customerName}
        </td>
        <td className="px-4 py-3 text-slate-500">{customer.areaName}</td>
        {products.map(p => (
          <td key={p.id} className="px-4 py-3 text-center font-medium">{formatNumber(customer.productQuantities[p.id] || 0)}</td>
        ))}
        <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{formatNumber(customer.totalCrates)}</td>
        <td className="px-4 py-3 text-right font-bold">{formatMoney(customer.saleAmount)}</td>
        <td className="px-4 py-3 text-right font-bold text-alvoun-green">{formatMoney(customer.receivedAmount)}</td>
        <td className="px-4 py-3 text-right font-bold text-alvoun-red">{formatMoney(customer.dueAmount)}</td>
      </tr>
      
      {expanded && hasTransactions && (
        <tr className="bg-slate-50 dark:bg-slate-900/50 border-t-0">
          <td colSpan={6 + products.length} className="px-8 py-3 pb-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Transactions</h4>
              {customer.transactions.map((tx: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 text-sm font-medium">
                  <span className="text-slate-500 w-16">{tx.time}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tx.type === 'SALE' ? 'bg-alvoun-blue/10 text-alvoun-blue' : 'bg-alvoun-green/10 text-alvoun-green'}`}>
                    {tx.type}
                  </span>
                  <span className="flex-1 text-slate-700 dark:text-slate-300">
                    {tx.type === 'SALE' 
                      ? `ID: ${tx.id.slice(-6)} - ${formatMoney(tx.amount)}` 
                      : `Collected: ${formatMoney(tx.amount)}`}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
