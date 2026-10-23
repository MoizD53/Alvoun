'use client';

import React, { useState, useMemo } from 'react';
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
  X,
  Pencil,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createExpense, updateExpense, deleteExpense } from '@/lib/actions/admin/expense';
import { formatMoney } from '@/lib/format';

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

const BASE_CATEGORIES = [
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

  // Create Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    category: 'FUEL',
    customCategory: '',
    isCustomCategory: false,
    title: '',
    amountRupees: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    recipient: '',
    referenceNo: '',
    notes: '',
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    category: 'FUEL',
    customCategory: '',
    isCustomCategory: false,
    title: '',
    amountRupees: '',
    expenseDate: '',
    paymentMethod: 'CASH',
    recipient: '',
    referenceNo: '',
    notes: '',
  });

  // Dynamically collect all categories that exist in data + base categories
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>(['FUEL', 'TRANSPORTATION', 'VEHICLE_MAINTENANCE', 'SALARY', 'LABOUR', 'ELECTRICITY', 'MISCELLANEOUS']);
    initialData.expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [initialData.expenses]);

  const handleFilterCategory = (cat: string) => {
    const params = new URLSearchParams(window.location.search);
    if (cat === 'ALL') {
      params.delete('category');
    } else {
      params.set('category', cat);
    }
    router.push(`/dashboard/admin/expenses?${params.toString()}`);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const val = parseFloat(formData.amountRupees);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Please enter a valid expense amount');
      return;
    }

    const finalCategory = formData.isCustomCategory
      ? formData.customCategory.trim().toUpperCase()
      : formData.category;

    if (!finalCategory) {
      setErrorMsg('Please select or specify an expense category');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createExpense({
        category: finalCategory,
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
          customCategory: '',
          isCustomCategory: false,
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

  // Open Edit Modal with prefilled values
  const handleOpenEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setEditErrorMsg('');

    const formattedDate = expense.expenseDate instanceof Date
      ? expense.expenseDate.toISOString().split('T')[0]
      : String(expense.expenseDate).split('T')[0];

    const isCustom = !BASE_CATEGORIES.some((c) => c.id === expense.category);

    setEditFormData({
      category: isCustom ? '__CUSTOM__' : expense.category,
      customCategory: isCustom ? expense.category : '',
      isCustomCategory: isCustom,
      title: expense.title,
      amountRupees: (expense.amount / 100).toFixed(2),
      expenseDate: formattedDate,
      paymentMethod: expense.paymentMethod || 'CASH',
      recipient: expense.recipient || '',
      referenceNo: expense.referenceNo || '',
      notes: expense.notes || '',
    });
    setEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    setEditErrorMsg('');

    const val = parseFloat(editFormData.amountRupees);
    if (isNaN(val) || val <= 0) {
      setEditErrorMsg('Please enter a valid expense amount');
      return;
    }

    const finalCategory = editFormData.isCustomCategory
      ? editFormData.customCategory.trim().toUpperCase()
      : editFormData.category;

    if (!finalCategory) {
      setEditErrorMsg('Please select or specify an expense category');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const res = await updateExpense(editingExpense.id, {
        category: finalCategory,
        title: editFormData.title,
        amountPaise: Math.round(val * 100),
        expenseDate: editFormData.expenseDate,
        paymentMethod: editFormData.paymentMethod,
        recipient: editFormData.recipient,
        referenceNo: editFormData.referenceNo,
        notes: editFormData.notes,
      });

      if (res?.error) {
        setEditErrorMsg(res.error);
      } else {
        setSuccessMsg(`Expense "${editFormData.title}" updated successfully!`);
        setEditModalOpen(false);
        setEditingExpense(null);
        router.refresh();
      }
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Failed to update expense');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title?: string) => {
    if (!confirm(`Are you sure you want to delete this expense record: "${title || id}"?`)) return;
    try {
      await deleteExpense(id);
      setSuccessMsg('Expense deleted successfully.');
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
    <div className="space-y-6 select-none">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight font-sans">
            Expense Vouchers & Outflows
          </h1>
          <p className="text-xs text-secondary font-medium mt-0.5">
            Operational cash outflow ledger (Salary, Fuel, Transportation, Maintenance, Labour, Electricity & Custom Outflows)
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
            className="shadow-raised font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Record Expense
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-between animate-fade-in">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-surface-raised border-border-default shadow-raised">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
            Total Expenses
          </span>
          <div className="text-2xl font-black text-primary tracking-tight font-sans tabular-nums mt-1">
            {formatMoney(initialData.totalAmountPaise)}
          </div>
          <span className="text-[10px] text-muted font-medium mt-1 block">
            {initialData.count} Vouchers Recorded
          </span>
        </Card>

        <Card className="p-4 bg-surface-raised border-border-default shadow-raised">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
            Fuel Outflow
          </span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight font-sans tabular-nums mt-1">
            {formatMoney(initialData.categoryTotals['FUEL'] || 0)}
          </div>
          <span className="text-[10px] text-muted font-medium mt-1 block">Logistics & Delivery</span>
        </Card>

        <Card className="p-4 bg-surface-raised border-border-default shadow-raised">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
            Labour & Wages
          </span>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 tracking-tight font-sans tabular-nums mt-1">
            {formatMoney(initialData.categoryTotals['LABOUR'] || 0)}
          </div>
          <span className="text-[10px] text-muted font-medium mt-1 block">Daily / Factory Labour</span>
        </Card>

        <Card className="p-4 bg-surface-raised border-border-default shadow-raised">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
            Plant Utilities
          </span>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-400 tracking-tight font-sans tabular-nums mt-1">
            {formatMoney(initialData.categoryTotals['ELECTRICITY'] || 0)}
          </div>
          <span className="text-[10px] text-muted font-medium mt-1 block">Power & Grid Utilities</span>
        </Card>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {BASE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = currentCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleFilterCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-teal-600 text-white shadow-raised-sm'
                  : 'bg-surface-raised border border-border-default text-secondary hover:text-primary hover:bg-surface-inset'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Expense Ledger Table */}
      <Card className="overflow-hidden bg-surface-raised border-border-default shadow-raised">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-inset border-b border-border-default text-secondary uppercase text-[10px] font-extrabold tracking-wider">
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
            <tbody className="divide-y divide-border-subtle font-sans">
              {initialData.expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-secondary">
                    No expense records found matching current criteria.
                  </td>
                </tr>
              ) : (
                initialData.expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-inset/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-primary tabular-nums">
                      {new Date(e.expenseDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'Asia/Kolkata',
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
                    {/* Clean Bold Standard Font (No Monospace / No Slashed Zeros) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-black text-primary tabular-nums text-sm">
                      ₹{(e.amount / 100).toFixed(2)}
                    </td>
                    {/* Action Column: Both Edit & Delete */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(e)}
                          className="text-secondary hover:text-teal-700 dark:hover:text-teal-400 p-1.5 rounded-lg transition-all cursor-pointer hover:bg-surface-inset active:scale-95"
                          title="Edit Expense"
                          aria-label="Edit Expense"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(e.id, e.title)}
                          className="text-secondary hover:text-danger p-1.5 rounded-lg transition-all cursor-pointer hover:bg-surface-inset active:scale-95"
                          title="Delete Expense"
                          aria-label="Delete Expense"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface-raised border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border-default bg-surface-inset">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-bold text-primary">Record Expense Voucher</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-secondary hover:text-primary p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Category Dropdown with Option to Create New Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-secondary">Expense Category *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        isCustomCategory: !prev.isCustomCategory,
                      }));
                    }}
                    className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{formData.isCustomCategory ? 'Use Existing Category' : '+ New Category'}</span>
                  </button>
                </div>

                {formData.isCustomCategory ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Type custom category (e.g. PACKAGING, OFFICE, REPAIR)"
                      value={formData.customCategory}
                      onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                      className="w-full rounded-xl bg-surface-inset border border-teal-500 px-3 py-2 text-primary font-bold uppercase focus:outline-teal-600"
                      required
                    />
                    <span className="text-[10px] text-muted block">Custom category will be saved and visible to admins</span>
                  </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setFormData({ ...formData, isCustomCategory: true });
                      } else {
                        setFormData({ ...formData, category: e.target.value, isCustomCategory: false });
                      }
                    }}
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
                    {allAvailableCategories
                      .filter((c) => !['FUEL', 'TRANSPORTATION', 'VEHICLE_MAINTENANCE', 'SALARY', 'LABOUR', 'ELECTRICITY', 'MISCELLANEOUS'].includes(c))
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat} (Custom)
                        </option>
                      ))}
                    <option value="__NEW__">+ Create New Category...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-secondary mb-1">Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Diesel for Delivery Truck GJ-20"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600 font-medium"
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
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary font-black text-sm tabular-nums focus:outline-teal-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary font-bold tabular-nums focus:outline-teal-600"
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
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary font-medium focus:outline-teal-600"
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

      {/* Edit Expense Modal */}
      {editModalOpen && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface-raised border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border-default bg-surface-inset">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-bold text-primary">Edit Expense Voucher</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-secondary hover:text-primary p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-3.5 text-xs">
              {editErrorMsg && (
                <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold">
                  {editErrorMsg}
                </div>
              )}

              {/* Category Dropdown with Option to Create New Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-secondary">Expense Category *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormData((prev) => ({
                        ...prev,
                        isCustomCategory: !prev.isCustomCategory,
                      }));
                    }}
                    className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{editFormData.isCustomCategory ? 'Use Existing Category' : '+ New Category'}</span>
                  </button>
                </div>

                {editFormData.isCustomCategory ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Type custom category name (e.g. PACKAGING)"
                      value={editFormData.customCategory}
                      onChange={(e) => setEditFormData({ ...editFormData, customCategory: e.target.value })}
                      className="w-full rounded-xl bg-surface-inset border border-teal-500 px-3 py-2 text-primary font-bold uppercase focus:outline-teal-600"
                      required
                    />
                  </div>
                ) : (
                  <select
                    value={editFormData.category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setEditFormData({ ...editFormData, isCustomCategory: true });
                      } else {
                        setEditFormData({ ...editFormData, category: e.target.value, isCustomCategory: false });
                      }
                    }}
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
                    {allAvailableCategories
                      .filter((c) => !['FUEL', 'TRANSPORTATION', 'VEHICLE_MAINTENANCE', 'SALARY', 'LABOUR', 'ELECTRICITY', 'MISCELLANEOUS'].includes(c))
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat} (Custom)
                        </option>
                      ))}
                    <option value="__NEW__">+ Create New Category...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-secondary mb-1">Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Diesel for Delivery Truck GJ-20"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600 font-medium"
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
                    value={editFormData.amountRupees}
                    onChange={(e) => setEditFormData({ ...editFormData, amountRupees: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary font-black text-sm tabular-nums focus:outline-teal-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary mb-1">Date *</label>
                  <input
                    type="date"
                    value={editFormData.expenseDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expenseDate: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary font-bold tabular-nums focus:outline-teal-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-secondary mb-1">Payment Method</label>
                  <select
                    value={editFormData.paymentMethod}
                    onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary font-medium focus:outline-teal-600"
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
                    value={editFormData.recipient}
                    onChange={(e) => setEditFormData({ ...editFormData, recipient: e.target.value })}
                    className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-secondary mb-1">Receipt / Voucher No (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. REC-9842"
                  value={editFormData.referenceNo}
                  onChange={(e) => setEditFormData({ ...editFormData, referenceNo: e.target.value })}
                  className="w-full rounded-xl bg-surface-inset border border-border-default px-3 py-2 text-primary focus:outline-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isEditSubmitting}
                >
                  {isEditSubmitting ? 'Updating...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
