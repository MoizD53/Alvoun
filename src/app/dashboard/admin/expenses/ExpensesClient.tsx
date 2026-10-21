'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Receipt, 
  Plus, 
  Fuel, 
  Truck, 
  Wrench, 
  Users, 
  Zap, 
  Coins, 
  Trash2, 
  Download, 
  Filter,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createExpense, deleteExpense } from '@/lib/actions/admin/expense';

interface ExpenseItem {
  id: string;
  category: string;
  title: string;
  amount: number;
  expenseDate: Date | string;
  paymentMethod: string;
  recipient?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
}

interface ExpensesClientProps {
  initialData: {
    expenses: ExpenseItem[];
    totalAmountPaise: number;
    categoryTotals: Record<string, number>;
    count: number;
  };
  currentCategory: string;
  startDate: string;
  endDate: string;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Expenses', icon: Receipt },
  { id: 'SALARY', label: 'Salary', icon: Users },
  { id: 'FUEL', label: 'Fuel', icon: Fuel },
  { id: 'TRANSPORTATION', label: 'Transportation', icon: Truck },
  { id: 'VEHICLE_MAINTENANCE', label: 'Vehicle Maint.', icon: Wrench },
  { id: 'LABOUR', label: 'Labour', icon: Users },
  { id: 'ELECTRICITY', label: 'Electricity', icon: Zap },
  { id: 'MISCELLANEOUS', label: 'Miscellaneous', icon: Coins },
];

export default function ExpensesClient({
  initialData,
  currentCategory,
  startDate,
  endDate,
}: ExpensesClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    category: 'FUEL',
    title: '',
    amountRupees: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    recipient: '',
    referenceNo: '',
    notes: '',
  });

  const handleFilterCategory = (cat: string) => {
    const params = new URLSearchParams(window.location.search);
    if (cat === 'ALL') {
      params.delete('category');
    } else {
      params.set('category', cat);
    }
    router.push(`/dashboard/admin/expenses?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const val = parseFloat(formData.amountRupees);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Please enter a valid expense amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createExpense({
        category: formData.category,
        title: formData.title,
        amountPaise: Math.round(val * 100),
        expenseDate: formData.expenseDate,
        paymentMethod: formData.paymentMethod,
        recipient: formData.recipient,
        referenceNo: formData.referenceNo,
        notes: formData.notes,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Expense recorded successfully!');
        setModalOpen(false);
        setFormData({
          category: 'FUEL',
          title: '',
          amountRupees: '',
          expenseDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'CASH',
          recipient: '',
          referenceNo: '',
          notes: '',
        });
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await deleteExpense(id);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const exportToExcel = async () => {
    const xlsx = await import('xlsx');
    const rows = initialData.expenses.map((e) => ({
      Date: new Date(e.expenseDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
      Category: e.category,
      Title: e.title,
      'Amount (₹)': (e.amount / 100).toFixed(2),
      'Payment Method': e.paymentMethod,
      Recipient: e.recipient || 'N/A',
      'Reference No': e.referenceNo || 'N/A',
      'Recorded By': e.recordedBy || 'Admin',
      Notes: e.notes || '',
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    xlsx.writeFile(workbook, `Expenses_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight font-sans">
            Expense Vouchers & Outflows
          </h1>
          <p className="text-xs text-secondary font-medium mt-0.5">
            Operational cash outflow ledger (Salary, Fuel, Transportation, Maintenance, Labour, Electricity)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="border-border-default shadow-raised bg-surface-raised text-primary"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export XLSX
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="shadow-raised font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-teal-600 bg-surface-raised border-border-default shadow-raised">
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
            Total Outflow
          </span>
          <div className="text-2xl font-black text-primary mt-1 font-sans">
            ₹{(initialData.totalAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-secondary mt-0.5 block">
            {initialData.count} vouchers recorded
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 bg-surface-raised border-border-default shadow-raised">
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
            Fuel & Transport
          </span>
          <div className="text-2xl font-black text-primary mt-1 font-sans">
            ₹{(((initialData.categoryTotals['FUEL'] || 0) + (initialData.categoryTotals['TRANSPORTATION'] || 0)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-secondary mt-0.5 block">
            Fleet & transit logistics
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 bg-surface-raised border-border-default shadow-raised">
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
            Salary & Labour
          </span>
          <div className="text-2xl font-black text-primary mt-1 font-sans">
            ₹{(((initialData.categoryTotals['SALARY'] || 0) + (initialData.categoryTotals['LABOUR'] || 0)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-secondary mt-0.5 block">
            Payroll & daily manpower
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-sky-500 bg-surface-raised border-border-default shadow-raised">
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
            Electricity & Maintenance
          </span>
          <div className="text-2xl font-black text-primary mt-1 font-sans">
            ₹{(((initialData.categoryTotals['ELECTRICITY'] || 0) + (initialData.categoryTotals['VEHICLE_MAINTENANCE'] || 0)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-secondary mt-0.5 block">
            Factory power & machinery
          </span>
        </Card>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = currentCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleFilterCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none ${
                isSelected
                  ? 'bg-teal-700 text-white shadow-raised'
                  : 'bg-surface-raised border border-border-default text-secondary hover:text-primary hover:bg-surface-inset'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
              {cat.id !== 'ALL' && initialData.categoryTotals[cat.id] ? (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-teal-800 text-teal-100' : 'bg-surface-inset text-secondary'}`}>
                  ₹{Math.round((initialData.categoryTotals[cat.id] || 0) / 100)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Expenses Table Card */}
      <Card className="overflow-hidden border border-border-default bg-surface-raised shadow-raised">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-inset text-secondary font-semibold border-b border-border-default uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/60">
              {initialData.expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-secondary">
                    No expense records found for the selected category.
                  </td>
                </tr>
              ) : (
                initialData.expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-inset/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-primary">
                      {new Date(e.expenseDate).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant="neutral" styleType="subtle" size="sm">
                        {e.category.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium text-primary">
                      <div>{e.title}</div>
                      {e.notes && <span className="text-[10px] text-secondary line-clamp-1">{e.notes}</span>}
                    </td>
                    <td className="py-3 px-4 text-secondary">
                      {e.recipient || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-inset border border-border-default text-primary">
                        {e.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-primary font-mono text-sm">
                      ₹{(e.amount / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-secondary hover:text-danger p-1 rounded-md transition-colors"
                        title="Delete voucher"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-raised border border-border-default rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-border-default bg-surface-inset">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-bold text-primary">Record Expense Voucher</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-secondary hover:text-primary p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-semibold text-secondary mb-1">Expense Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary font-medium focus:outline-teal-600"
                  required
                >
                  <option value="FUEL">Fuel (Diesel / Petrol for logistics)</option>
                  <option value="TRANSPORTATION">Transportation & Freight</option>
                  <option value="VEHICLE_MAINTENANCE">Vehicle Maintenance & Repairs</option>
                  <option value="SALARY">Salary Disbursement</option>
                  <option value="LABOUR">Factory Labour / Daily Wages</option>
                  <option value="ELECTRICITY">Electricity & Power Utility</option>
                  <option value="MISCELLANEOUS">Miscellaneous / Factory Overhead</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-secondary mb-1">Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Diesel for Delivery Truck GJ-20"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-secondary mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amountRupees}
                    onChange={(e) => setFormData({ ...formData, amountRupees: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary font-bold text-sm focus:outline-teal-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-secondary mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-secondary mb-1">Recipient / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Bharat Petroleum"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-secondary mb-1">Receipt / Voucher No (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. REC-9842"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                  className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Voucher'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
