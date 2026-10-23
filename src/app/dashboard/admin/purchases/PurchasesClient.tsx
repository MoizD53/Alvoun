'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Plus, 
  Download, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Building2, 
  Boxes, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  PackageCheck, 
  Package, 
  X, 
  ChevronRight,
  TrendingUp,
  Receipt,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatMoney, formatNumber } from '@/lib/format';
import { 
  createPurchase, 
  deletePurchase, 
  createSupplier, 
  recordSupplierPayment 
} from '@/lib/actions/admin/purchase';

interface PurchaseItem {
  id: string;
  materialId?: string | null;
  materialName: string;
  category: string;
  quantity: number;
  unit: string;
  rate: number; // in Paise
  totalAmount: number; // in Paise
  material?: { name: string; currentStock: number } | null;
}

interface PurchaseRecord {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierInvoiceNo?: string | null;
  purchaseDate: Date | string;
  totalAmount: number; // in Paise
  paidAmount: number; // in Paise
  paymentStatus: string;
  paymentMethod: string;
  remarks?: string | null;
  supplier: { id: string; name: string; phone?: string | null; gstin?: string | null };
  items: PurchaseItem[];
  payments: any[];
}

interface EnrichedSupplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  openingBalance: number;
  openingBalanceType: string;
  paymentTerms?: string | null;
  notes?: string | null;
  totalPurchasesPaise: number;
  totalPaidPaise: number;
  balancePaise: number;
  purchasesCount: number;
}

interface RawMaterialSummary {
  materialName: string;
  category: string;
  unit: string;
  totalQuantity: number;
  totalSpendPaise: number;
  averageRatePaise: number;
  purchasesCount: number;
}

interface PurchasesClientProps {
  initialData: {
    purchases: PurchaseRecord[];
    suppliers: EnrichedSupplier[];
    rawMaterials: { id: string; name: string; category: string; unit: string; currentStock: number }[];
    payments: any[];
    rawMaterialPurchases: RawMaterialSummary[];
    summary: {
      totalPurchaseValuePaise: number;
      paymentsMadePaise: number;
      outstandingPayablesPaise: number;
      itemsPurchasedCount: number;
      suppliersServedCount: number;
    };
  };
  currentSupplier: string;
  currentStatus: string;
  startDate: string;
  endDate: string;
}

export default function PurchasesClient({
  initialData,
  currentSupplier,
  currentStatus,
  startDate,
  endDate,
}: PurchasesClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'register' | 'raw_materials' | 'suppliers' | 'payments'>('register');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(currentStatus);
  const [supplierFilter, setSupplierFilter] = useState(currentSupplier);

  // Modals state
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<PurchaseRecord | null>(null);

  // Form submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: initialData.suppliers[0]?.id || '',
    purchaseDate: new Date().toISOString().split('T')[0],
    supplierInvoiceNo: '',
    items: [
      {
        materialId: initialData.rawMaterials[0]?.id || '',
        materialName: initialData.rawMaterials[0]?.name || 'Preform (1 Litre)',
        category: initialData.rawMaterials[0]?.category || 'PREFORM',
        quantity: '100',
        unit: initialData.rawMaterials[0]?.unit || 'KG',
        rateRupees: '120',
      },
    ],
    paidAmountRupees: '0',
    paymentMethod: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE',
    remarks: '',
  });

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    address: '',
    gstin: '',
    openingBalanceRupees: '0',
    openingBalanceType: 'CREDIT' as 'CREDIT' | 'DEBIT',
    paymentTerms: '30 Days',
    notes: '',
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    supplierId: initialData.suppliers[0]?.id || '',
    purchaseId: '',
    amountRupees: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE',
    referenceNo: '',
    remarks: '',
  });

  // Calculate purchase modal total live
  const calculatedModalTotalPaise = useMemo(() => {
    return purchaseForm.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rateRupees) || 0;
      return sum + Math.round(qty * rate * 100);
    }, 0);
  }, [purchaseForm.items]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return initialData.purchases.filter((p) => {
      if (statusFilter !== 'ALL' && p.paymentStatus !== statusFilter) return false;
      if (supplierFilter !== 'ALL' && p.supplierId !== supplierFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesNo = p.purchaseNumber.toLowerCase().includes(q);
        const matchesSup = p.supplier.name.toLowerCase().includes(q);
        const matchesInv = p.supplierInvoiceNo ? p.supplierInvoiceNo.toLowerCase().includes(q) : false;
        const matchesItems = p.items.some((i) => i.materialName.toLowerCase().includes(q));
        return matchesNo || matchesSup || matchesInv || matchesItems;
      }
      return true;
    });
  }, [initialData.purchases, statusFilter, supplierFilter, searchTerm]);

  // Handle adding line item in Record Purchase Modal
  const handleAddLineItem = () => {
    const defaultMat = initialData.rawMaterials[0];
    setPurchaseForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          materialId: defaultMat?.id || '',
          materialName: defaultMat?.name || 'Raw Material',
          category: defaultMat?.category || 'RAW_MATERIAL',
          quantity: '1',
          unit: defaultMat?.unit || 'PCS',
          rateRupees: '0',
        },
      ],
    }));
  };

  const handleRemoveLineItem = (index: number) => {
    if (purchaseForm.items.length <= 1) return;
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleLineItemChange = (index: number, field: string, value: string) => {
    setPurchaseForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index], [field]: value };

      // If user selected a known raw material, auto-fill unit & category
      if (field === 'materialId') {
        const mat = initialData.rawMaterials.find((m) => m.id === value);
        if (mat) {
          item.materialName = mat.name;
          item.category = mat.category;
          item.unit = mat.unit;
        }
      }

      items[index] = item;
      return { ...prev, items };
    });
  };

  // Submit Record Purchase
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!purchaseForm.supplierId) {
      setErrorMsg('Please select a supplier');
      return;
    }

    const parsedItems = purchaseForm.items.map((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rateRupees) || 0;
      return {
        materialId: item.materialId || null,
        materialName: item.materialName.trim(),
        category: item.category,
        quantity: qty,
        unit: item.unit,
        ratePaise: Math.round(rate * 100),
        totalAmountPaise: Math.round(qty * rate * 100),
      };
    });

    if (parsedItems.some((i) => i.quantity <= 0)) {
      setErrorMsg('All line item quantities must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const paidPaise = Math.round((parseFloat(purchaseForm.paidAmountRupees) || 0) * 100);
      const res = await createPurchase({
        supplierId: purchaseForm.supplierId,
        purchaseDate: purchaseForm.purchaseDate,
        supplierInvoiceNo: purchaseForm.supplierInvoiceNo || null,
        items: parsedItems,
        paidAmountPaise: paidPaise,
        paymentMethod: purchaseForm.paymentMethod,
        remarks: purchaseForm.remarks || null,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Purchase ${(res as any).purchase?.purchaseNumber ?? ''} recorded successfully!`);
        setTimeout(() => {
          setPurchaseModalOpen(false);
          setSuccessMsg('');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to record purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit New Supplier
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!supplierForm.name.trim()) {
      setErrorMsg('Supplier name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const openingPaise = Math.round((parseFloat(supplierForm.openingBalanceRupees) || 0) * 100);
      const res = await createSupplier({
        name: supplierForm.name.trim(),
        contactPerson: supplierForm.contactPerson.trim() || null,
        phone: supplierForm.phone.trim() || null,
        address: supplierForm.address.trim() || null,
        gstin: supplierForm.gstin.trim() || null,
        openingBalancePaise: openingPaise,
        openingBalanceType: supplierForm.openingBalanceType,
        paymentTerms: supplierForm.paymentTerms.trim() || null,
        notes: supplierForm.notes.trim() || null,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Supplier added successfully');
        setTimeout(() => {
          setSupplierModalOpen(false);
          setSuccessMsg('');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to add supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Supplier Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const amt = parseFloat(paymentForm.amountRupees) || 0;
    if (amt <= 0) {
      setErrorMsg('Payment amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordSupplierPayment({
        supplierId: paymentForm.supplierId,
        purchaseId: paymentForm.purchaseId || null,
        amountPaise: Math.round(amt * 100),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        referenceNo: paymentForm.referenceNo || null,
        remarks: paymentForm.remarks || null,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Payment recorded successfully');
        setTimeout(() => {
          setPaymentModalOpen(false);
          setSuccessMsg('');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Purchase
  const handleDeletePurchase = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete purchase ${num}? Raw material inward stock will be reversed safely.`)) {
      return;
    }
    const res = await deletePurchase(id);
    if (res?.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  // Export Excel
  const handleExportXLSX = async () => {
    const xlsx = await import('xlsx');
    const sheetData = initialData.purchases.map((p) => ({
      'PO Number': p.purchaseNumber,
      'Date': new Date(p.purchaseDate).toLocaleDateString('en-IN'),
      'Supplier': p.supplier.name,
      'Invoice No': p.supplierInvoiceNo || 'N/A',
      'Total Amount (₹)': (p.totalAmount / 100).toFixed(2),
      'Paid Amount (₹)': (p.paidAmount / 100).toFixed(2),
      'Outstanding (₹)': ((p.totalAmount - p.paidAmount) / 100).toFixed(2),
      'Payment Status': p.paymentStatus,
      'Payment Method': p.paymentMethod,
      'Items': p.items.map((i) => `${i.materialName} (${i.quantity} ${i.unit})`).join(', '),
      'Remarks': p.remarks || '',
    }));

    const ws = xlsx.utils.json_to_sheet(sheetData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Purchases Register');
    xlsx.writeFile(wb, `Alvoun-Purchases-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-raised p-6 rounded-2xl border border-border/40 shadow-raised">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchases & Procurement</h1>
            <p className="text-sm text-muted-foreground">
              Track supplier purchases, raw materials, purchase costs, payments and outstanding balances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExportXLSX}
            className="flex-1 sm:flex-none border-border/60 bg-surface-raised hover:bg-surface-inset text-foreground font-medium shadow-raised-sm gap-2"
          >
            <Download className="h-4 w-4 text-primary" />
            Export Excel
          </Button>

          <Button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setPurchaseModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-raised gap-2"
          >
            <Plus className="h-4 w-4" />
            + Record Purchase
          </Button>
        </div>
      </div>

      {/* 2. Live Summary Cards (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="p-4 bg-surface-raised border-border/40 shadow-raised hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Purchase Value</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-primary font-sans tabular-nums">
              {formatMoney(initialData.summary.totalPurchaseValuePaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Purchases in period</p>
          </div>
        </Card>

        <Card className="p-4 bg-surface-raised border-border/40 shadow-raised hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payments Made</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-sans tabular-nums">
              {formatMoney(initialData.summary.paymentsMadePaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Cleared supplier dues</p>
          </div>
        </Card>

        <Card className="p-4 bg-surface-raised border-border/40 shadow-raised hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Payables</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400 font-sans tabular-nums">
              {formatMoney(initialData.summary.outstandingPayablesPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Current supplier balance</p>
          </div>
        </Card>

        <Card className="p-4 bg-surface-raised border-border/40 shadow-raised hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items Purchased</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-foreground font-sans tabular-nums">
              {formatNumber(initialData.summary.itemsPurchasedCount)} <span className="text-sm font-semibold text-muted-foreground">Units</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Raw materials inward</p>
          </div>
        </Card>

        <Card className="p-4 bg-surface-raised border-border/40 shadow-raised hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suppliers Served</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-foreground font-sans tabular-nums">
              {initialData.summary.suppliersServedCount} <span className="text-sm font-semibold text-muted-foreground">/ {initialData.suppliers.length}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active vendors</p>
          </div>
        </Card>
      </div>

      {/* 3. Tabs Navigation */}
      <div className="inline-flex p-1.5 bg-surface-inset shadow-inset rounded-2xl border border-border/40 gap-1.5">
        <button
          onClick={() => setActiveTab('register')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'register'
              ? 'bg-primary text-primary-foreground shadow-raised-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Purchase Register</span>
        </button>

        <button
          onClick={() => setActiveTab('raw_materials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'raw_materials'
              ? 'bg-primary text-primary-foreground shadow-raised-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Raw Material Purchases</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-primary text-primary-foreground shadow-raised-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Suppliers</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-primary text-primary-foreground shadow-raised-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Supplier Payments</span>
        </button>
      </div>

      {/* TAB 1: PURCHASE REGISTER */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              <div className="relative min-w-[200px] max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
                <input
                  type="text"
                  placeholder="Search PO#, supplier, material, bill#..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-inset border border-border-default text-xs font-semibold text-primary placeholder:text-muted focus:border-teal-500 outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-surface-inset border border-border-default text-primary cursor-pointer outline-none"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PENDING">Pending</option>
              </select>

              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-surface-inset border border-border-default text-primary cursor-pointer outline-none"
              >
                <option value="ALL">All Suppliers ({initialData.suppliers.length})</option>
                {initialData.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-muted">
              Showing {filteredPurchases.length} of {initialData.purchases.length} purchases
            </div>
          </div>

          {/* Register Table */}
          <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-surface-sidebar/95 border-b border-border-default text-secondary font-extrabold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Purchase No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Items / Materials</th>
                    <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                    <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/50 font-sans">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-secondary text-sm">
                        No purchases found. Click <strong>+ Record Purchase</strong> to record your first supplier procurement.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => {
                      const outstanding = p.totalAmount - p.paidAmount;
                      return (
                        <tr key={p.id} className="hover:bg-surface-inset/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-primary">
                            <div>{p.purchaseNumber}</div>
                            {p.supplierInvoiceNo && (
                              <div className="text-[10px] text-muted">Inv #{p.supplierInvoiceNo}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-secondary font-medium">
                            {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-primary">
                            {p.supplier.name}
                          </td>
                          <td className="py-2.5 px-3 text-secondary">
                            <div className="max-w-[220px] truncate" title={p.items.map((i) => `${i.materialName} (${i.quantity} ${i.unit})`).join(', ')}>
                              {p.items.map((i) => `${i.materialName} (${i.quantity} ${i.unit})`).join(', ')}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-primary tabular-nums">
                            {formatMoney(p.totalAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatMoney(p.paidAmount)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                            outstanding > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-secondary'
                          }`}>
                            {formatMoney(outstanding)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${
                              p.paymentStatus === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : p.paymentStatus === 'PARTIAL'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            }`}>
                              {p.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedPurchaseDetails(p)}
                                className="p-1.5 rounded-lg hover:bg-surface-inset text-secondary hover:text-primary transition-colors cursor-pointer"
                                title="View Purchase Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePurchase(p.id, p.purchaseNumber)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors cursor-pointer"
                                title="Delete Purchase & Reverse Stock"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RAW MATERIAL PURCHASES */}
      {activeTab === 'raw_materials' && (
        <div className="space-y-4">
          <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border-default flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-primary">Raw Material Inward Summary</h3>
                <p className="text-xs text-secondary">
                  Purchased preforms, caps, labels, shrink roll, packaging and factory supplies.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-surface-sidebar/95 border-b border-border-default text-secondary font-extrabold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Material Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Total Quantity</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Avg Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total Spend (₹)</th>
                    <th className="py-2.5 px-3 text-center">Purchases Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/50 font-sans">
                  {initialData.rawMaterialPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-secondary text-sm">
                        No raw material purchases recorded yet.
                      </td>
                    </tr>
                  ) : (
                    initialData.rawMaterialPurchases.map((rm, idx) => (
                      <tr key={idx} className="hover:bg-surface-inset/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-primary">
                          {rm.materialName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            {rm.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-foreground tabular-nums">
                          {formatNumber(rm.totalQuantity)}
                        </td>
                        <td className="py-2.5 px-3 text-secondary font-medium">
                          {rm.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-secondary tabular-nums">
                          {formatMoney(rm.averageRatePaise)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-primary tabular-nums">
                          {formatMoney(rm.totalSpendPaise)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-secondary">
                          {rm.purchasesCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-surface-raised p-4 rounded-2xl border border-border-default shadow-raised">
            <div>
              <h3 className="font-bold text-sm text-primary">Supplier Directory & Outstanding Dues</h3>
              <p className="text-xs text-secondary">Manage external vendors, contact details, opening balances and payables.</p>
            </div>
            <Button
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setSupplierModalOpen(true);
              }}
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="font-bold shadow-raised-sm"
            >
              + Add Supplier
            </Button>
          </div>

          <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-surface-sidebar/95 border-b border-border-default text-secondary font-extrabold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Contact Person</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3 text-right">Total Purchases (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total Paid (₹)</th>
                    <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/50 font-sans">
                  {initialData.suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-secondary text-sm">
                        No suppliers recorded yet. Click <strong>+ Add Supplier</strong> to register your raw material vendors.
                      </td>
                    </tr>
                  ) : (
                    initialData.suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-inset/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-primary">
                          {s.name}
                        </td>
                        <td className="py-2.5 px-3 text-secondary">
                          {s.contactPerson || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-secondary font-medium">
                          {s.phone || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-secondary font-mono">
                          {s.gstin || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-primary tabular-nums">
                          {formatMoney(s.totalPurchasesPaise)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatMoney(s.totalPaidPaise)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black tabular-nums ${
                          s.balancePaise > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-secondary'
                        }`}>
                          {formatMoney(s.balancePaise)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPaymentForm((prev) => ({
                                ...prev,
                                supplierId: s.id,
                                amountRupees: s.balancePaise > 0 ? String(s.balancePaise / 100) : '',
                              }));
                              setPaymentModalOpen(true);
                            }}
                            className="text-[11px] font-bold py-0.5 px-2.5 rounded-lg border-teal-600/30 text-teal-800 dark:text-teal-300"
                          >
                            Pay Dues
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPLIER PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-surface-raised p-4 rounded-2xl border border-border-default shadow-raised">
            <div>
              <h3 className="font-bold text-sm text-primary">Payments Made to Suppliers</h3>
              <p className="text-xs text-secondary">Chronological log of cleared invoices, bank transfers, cheques and UPI transfers.</p>
            </div>
            <Button
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setPaymentModalOpen(true);
              }}
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="font-bold shadow-raised-sm"
            >
              + Record Payment
            </Button>
          </div>

          <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-surface-sidebar/95 border-b border-border-default text-secondary font-extrabold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Purchase No.</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Reference / Cheque</th>
                    <th className="py-2.5 px-3">Remarks</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/50 font-sans">
                  {initialData.payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-secondary text-sm">
                        No supplier payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    initialData.payments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-surface-inset/60 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-secondary">
                          {new Date(pmt.paymentDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-primary">
                          {pmt.supplier.name}
                        </td>
                        <td className="py-2.5 px-3 text-secondary font-medium">
                          {pmt.purchase?.purchaseNumber || 'General Account'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatMoney(pmt.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-inset border border-border-default text-primary">
                            {pmt.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-secondary">
                          {pmt.referenceNo || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-secondary">
                          {pmt.remarks || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-muted">
                          {pmt.recordedBy || 'Admin'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD PURCHASE */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised border border-border-default shadow-2xl rounded-2xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-primary">Record New Purchase</h3>
                  <p className="text-xs text-secondary">Enter supplier invoice, line items, and raw material quantities.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseModalOpen(false)}
                className="text-secondary hover:text-primary p-1.5 rounded-lg hover:bg-surface-inset transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePurchaseSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Supplier */}
                <div>
                  <label className="block font-bold text-primary mb-1">
                    Supplier <span className="text-danger">*</span>
                  </label>
                  <select
                    required
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                  >
                    {initialData.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block font-bold text-primary mb-1">
                    Purchase Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.purchaseDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                  />
                </div>

                {/* Supplier Invoice No */}
                <div>
                  <label className="block font-bold text-secondary mb-1">
                    Supplier Bill / Inv # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-99"
                    value={purchaseForm.supplierInvoiceNo}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierInvoiceNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 border-t border-b border-border-default py-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-secondary">
                    Purchase Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {purchaseForm.items.map((item, idx) => {
                    const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.rateRupees) || 0);
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-surface-inset border border-border-default/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        {/* Select Material */}
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-secondary mb-1">Material / Product</label>
                          <select
                            value={item.materialId || ''}
                            onChange={(e) => handleLineItemChange(idx, 'materialId', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                          >
                            <option value="">Custom Entry...</option>
                            {initialData.rawMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.category})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Material Name (editable if custom) */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-secondary mb-1">Item Name</label>
                          <input
                            type="text"
                            required
                            value={item.materialName}
                            onChange={(e) => handleLineItemChange(idx, 'materialName', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-secondary mb-1">Qty ({item.unit})</label>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-surface-raised border border-border-default text-primary font-bold text-right focus:border-teal-500 outline-none"
                          />
                        </div>

                        {/* Rate */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-secondary mb-1">Rate (₹)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={item.rateRupees}
                            onChange={(e) => handleLineItemChange(idx, 'rateRupees', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-surface-raised border border-border-default text-primary font-bold text-right focus:border-teal-500 outline-none"
                          />
                        </div>

                        {/* Total + Delete */}
                        <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                          <span className="sm:hidden font-bold text-secondary text-[10px]">Total: ₹{lineTotal.toFixed(2)}</span>
                          {purchaseForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              title="Remove line"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Details Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Value Live Display */}
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block">Total Bill Amount</span>
                  <div className="text-lg font-black text-teal-900 dark:text-teal-100 mt-0.5">
                    {formatMoney(calculatedModalTotalPaise)}
                  </div>
                </div>

                {/* Amount Paid Now */}
                <div>
                  <label className="block font-bold text-secondary mb-1">
                    Amount Paid Upfront (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={purchaseForm.paidAmountRupees}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmountRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-bold focus:border-teal-500 outline-none"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block font-bold text-secondary mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={purchaseForm.paymentMethod}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI (QR / GooglePay)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-secondary mb-1">
                  Notes / Purchase Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via truck #GJ-20-X, batch #45"
                  value={purchaseForm.remarks}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-medium focus:border-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPurchaseModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  leftIcon={<ShoppingCart className="h-4 w-4" />}
                  className="font-bold shadow-raised"
                >
                  Save & Inward Materials
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SUPPLIER */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised border border-border-default shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-primary">Add New Supplier</h3>
                  <p className="text-xs text-secondary">Register raw material or packaging vendor details.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSupplierModalOpen(false)}
                className="text-secondary hover:text-primary p-1.5 rounded-lg hover:bg-surface-inset transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSupplierSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-primary mb-1">
                  Supplier Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gujarat Polymers Ltd"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-secondary mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Mukesh Bhai"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-secondary mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-secondary mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    value={supplierForm.gstin}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-mono focus:border-teal-500 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-secondary mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={supplierForm.openingBalanceRupees}
                    onChange={(e) => setSupplierForm({ ...supplierForm, openingBalanceRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-bold focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-secondary mb-1">Office Address</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, GIDC Industrial Estate, Halol"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-medium focus:border-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSupplierModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  leftIcon={<Building2 className="h-4 w-4" />}
                  className="font-bold shadow-raised"
                >
                  Add Supplier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD SUPPLIER PAYMENT */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised border border-border-default shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-primary">Record Supplier Payment</h3>
                  <p className="text-xs text-secondary">Post a payment to clear vendor dues or settle an invoice.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-secondary hover:text-primary p-1.5 rounded-lg hover:bg-surface-inset transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-primary mb-1">
                  Supplier <span className="text-danger">*</span>
                </label>
                <select
                  required
                  value={paymentForm.supplierId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                >
                  {initialData.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Due: {formatMoney(s.balancePaise)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">
                    Amount Paid (₹) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={paymentForm.amountRupees}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-bold focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1">
                    Payment Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-secondary mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI (QR / GooglePay)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-secondary mb-1">Ref / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR12345678"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-medium focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-secondary mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Part payment against monthly supply"
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-medium focus:border-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  leftIcon={<CreditCard className="h-4 w-4" />}
                  className="font-bold shadow-raised"
                >
                  Record Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PURCHASE DETAILS VIEWER */}
      {selectedPurchaseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised border border-border-default shadow-2xl rounded-2xl w-full max-w-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div>
                <h3 className="text-base font-black text-primary">
                  {selectedPurchaseDetails.purchaseNumber}
                </h3>
                <p className="text-xs text-secondary">
                  Supplier: {selectedPurchaseDetails.supplier.name} • Date: {new Date(selectedPurchaseDetails.purchaseDate).toLocaleDateString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPurchaseDetails(null)}
                className="text-secondary hover:text-primary p-1.5 rounded-lg hover:bg-surface-inset transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="border border-border-default rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-surface-sidebar/95 border-b border-border-default text-secondary font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Quantity</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/50 font-sans">
                    {selectedPurchaseDetails.items.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-bold text-primary">{item.materialName}</td>
                        <td className="p-2.5 text-secondary">{item.category}</td>
                        <td className="p-2.5 text-right font-bold tabular-nums">{item.quantity} {item.unit}</td>
                        <td className="p-2.5 text-right tabular-nums">{formatMoney(item.rate)}</td>
                        <td className="p-2.5 text-right font-black tabular-nums">{formatMoney(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-surface-inset border border-border-default">
                <div>
                  <span className="text-[10px] text-secondary font-bold">Payment Status: </span>
                  <span className="font-bold text-primary">{selectedPurchaseDetails.paymentStatus}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-secondary font-bold block">Total Amount</span>
                  <span className="text-base font-black text-primary tabular-nums">
                    {formatMoney(selectedPurchaseDetails.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
