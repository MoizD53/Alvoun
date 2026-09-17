'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { calculateOutstanding } from '@/lib/outstanding';
import { 
  Phone, Plus, CreditCard, Edit, MapPin, 
  Calendar, ShoppingBag, ArrowLeft,
  ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerWorkspace({ customer }: { customer: any }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const outstanding = calculateOutstanding(customer);
  const isNegative = outstanding > 0; // Positive outstanding means customer owes us

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview' },
    { id: 'LEDGER', label: 'Ledger' },
    { id: 'SALES', label: 'Sales' },
    { id: 'PAYMENTS', label: 'Payments' },
    { id: 'VISITS', label: 'Visits' },
  ];

  const totalSales = customer.sales.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
  const totalPayments = customer.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  
  const lastVisit = customer.visits?.[0]?.createdAt ? new Date(customer.visits[0].createdAt).toLocaleDateString() : 'Never';
  const lastPayment = customer.payments?.[0]?.date ? new Date(customer.payments[0].date).toLocaleDateString() : 'None';

  // Build Ledger
  const ledgerEntries = [
    {
      id: 'opening',
      date: customer.createdAt,
      type: 'OPENING BALANCE',
      description: 'Opening Balance',
      amount: customer.openingBalance,
      isCredit: customer.openingBalanceType === 'CREDIT',
    },
    ...customer.sales.map((s: any) => ({
      id: `sale-${s.id}`,
      date: s.date,
      type: 'SALE',
      description: `Sale #${s.id.slice(-6)}`,
      amount: s.totalAmount,
      isCredit: false,
    })),
    ...customer.payments.map((p: any) => ({
      id: `payment-${p.id}`,
      date: p.date,
      type: 'PAYMENT',
      description: `Payment (${p.method})`,
      amount: p.amount,
      isCredit: true,
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = ledgerEntries.length > 0 && ledgerEntries[0].isCredit ? ledgerEntries[0].amount : (ledgerEntries.length > 0 ? -ledgerEntries[0].amount : 0);
  const ledgerWithBalance = ledgerEntries.map((entry, index) => {
    if (index > 0) {
      if (entry.isCredit) runningBalance += entry.amount;
      else runningBalance -= entry.amount;
    }
    return { ...entry, balance: runningBalance };
  }).reverse(); // Newest first

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Button */}
      <div>
        <Link href="/dashboard/admin/customers" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-alvoun-blue transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Customers
        </Link>
      </div>

      {/* Header Workspace Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.customerName}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                {customer.status}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> {customer.contact}</div>
              <div className="hidden sm:block text-slate-300">•</div>
              <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {customer.address}, {customer.city.name}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <a href={`tel:${customer.contact}`} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
              <Phone className="h-4 w-4" /> Call
            </a>
            <Link href={`/dashboard/admin/customers/${customer.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
              <Edit className="h-4 w-4" /> Edit
            </Link>
            {/* Note: New Sale and Payment would typically route to the mobile salesman flow or a dedicated admin form */}
          </div>
        </div>
        
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-t border-slate-100 bg-slate-50">
          <div className="p-4 md:p-6">
            <div className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Outstanding</div>
            <div className={`text-2xl font-bold ${isNegative ? 'text-alvoun-red' : 'text-slate-900'}`}>
              {formatMoney(Math.abs(outstanding))}
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Total Sales</div>
            <div className="text-2xl font-bold text-alvoun-blue">
              {formatMoney(totalSales)}
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Last Payment</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {lastPayment}
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Last Visit</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {lastVisit}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-6 py-4 text-sm font-medium border-b-2 transition-colors focus:outline-none
                ${activeTab === tab.id 
                  ? 'border-alvoun-blue text-alvoun-blue' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Assignment Details</h3>
                <dl className="space-y-4">
                  <div className="grid grid-cols-3">
                    <dt className="text-sm font-medium text-slate-500">Route</dt>
                    <dd className="col-span-2 text-sm font-medium text-slate-900">{customer.route.name}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-sm font-medium text-slate-500">Salesman</dt>
                    <dd className="col-span-2 text-sm font-medium text-slate-900">{customer.salesman.name}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-sm font-medium text-slate-500">Location</dt>
                    <dd className="col-span-2 text-sm text-slate-900">{customer.city.name}, {customer.state.name}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {/* Mock Activity Feed for UX - normally derived from actual timeline */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-alvoun-light text-alvoun-blue shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShoppingBag className="h-3 w-3" />
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-900 text-sm">Sale Recorded</div>
                        <time className="text-xs font-medium text-slate-500">{customer.sales?.[0] ? new Date(customer.sales[0].date).toLocaleDateString() : 'N/A'}</time>
                      </div>
                      <div className="text-slate-500 text-xs">Total: {customer.sales?.[0] ? formatMoney(customer.sales[0].totalAmount) : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LEDGER TAB */}
          {activeTab === 'LEDGER' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Debit (Owed)</th>
                    <th className="px-6 py-3 text-right">Credit (Paid)</th>
                    <th className="px-6 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerWithBalance.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-700">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-slate-900">{entry.description}</td>
                      <td className="px-6 py-3 text-right font-medium text-slate-600">
                        {!entry.isCredit ? formatMoney(entry.amount) : '-'}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-alvoun-green">
                        {entry.isCredit ? formatMoney(entry.amount) : '-'}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">
                        <span className={entry.balance < 0 ? 'text-alvoun-red' : ''}>
                          {formatMoney(Math.abs(entry.balance))} {entry.balance < 0 ? 'Dr' : 'Cr'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ledgerWithBalance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No ledger entries.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === 'SALES' && (
             <div className="overflow-x-auto rounded-lg border border-slate-200">
             <table className="w-full text-sm text-left whitespace-nowrap">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-3">Date</th>
                   <th className="px-6 py-3">Items</th>
                   <th className="px-6 py-3 text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {customer.sales.map((sale: any) => (
                   <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-3 font-medium text-slate-700">{new Date(sale.date).toLocaleDateString()}</td>
                     <td className="px-6 py-3 text-slate-600">
                       {sale.items.map((i: any) => `${i.crates}x crates`).join(', ')}
                     </td>
                     <td className="px-6 py-3 text-right font-bold text-slate-900">
                       {formatMoney(sale.totalAmount)}
                     </td>
                   </tr>
                 ))}
                 {customer.sales.length === 0 && (
                   <tr>
                     <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No sales recorded yet.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'PAYMENTS' && (
             <div className="overflow-x-auto rounded-lg border border-slate-200">
             <table className="w-full text-sm text-left whitespace-nowrap">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-3">Date</th>
                   <th className="px-6 py-3">Method</th>
                   <th className="px-6 py-3 text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {customer.payments.map((payment: any) => (
                   <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-3 font-medium text-slate-700">{new Date(payment.date).toLocaleDateString()}</td>
                     <td className="px-6 py-3">
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                         {payment.method}
                       </span>
                     </td>
                     <td className="px-6 py-3 text-right font-bold text-alvoun-green">
                       {formatMoney(payment.amount)}
                     </td>
                   </tr>
                 ))}
                 {customer.payments.length === 0 && (
                   <tr>
                     <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No payments recorded yet.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
          )}

          {/* VISITS TAB */}
          {activeTab === 'VISITS' && (
             <div className="overflow-x-auto rounded-lg border border-slate-200">
             <table className="w-full text-sm text-left whitespace-nowrap">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-3">Date</th>
                   <th className="px-6 py-3">Time</th>
                   <th className="px-6 py-3">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {customer.visits.map((visit: any) => (
                   <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-3 font-medium text-slate-700">{new Date(visit.date).toLocaleDateString()}</td>
                     <td className="px-6 py-3 text-slate-600">{new Date(visit.createdAt).toLocaleTimeString()}</td>
                     <td className="px-6 py-3">
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-alvoun-green">
                          <CheckCircle2 className="h-3 w-3" />
                          Visited
                       </span>
                     </td>
                   </tr>
                 ))}
                 {customer.visits.length === 0 && (
                   <tr>
                     <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No visits recorded yet.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
          )}
        </div>
      </div>
    </div>
  );
}
