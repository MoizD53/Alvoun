'use client';

import React, { useState, useMemo, useTransition, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Save, 
  RotateCcw, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Store, 
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowUpDown,
  MapPin,
  X,
  Keyboard,
  UserPlus,
  Phone,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Eraser,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney, formatNumber } from '@/lib/format';
import AdminDatePicker from '../components/AdminDatePicker';
import { 
  saveAdminEntryBatch, 
  quickCreateAdminEntryCustomer,
  quickUpdateAdminEntryCustomer,
  deleteAdminEntryCustomer,
  deleteAdminEntryRowTransactions
} from '@/lib/actions/admin/admin-entry';

interface CustomerRowData {
  id: string;
  customerName: string;
  firmName?: string | null;
  code?: string | null;
  contact: string;
  address: string;
  routeName: string;
  areaName: string;
  salesmanId?: string | null;
  currentOutstandingPaise: number;
  previousDuePaise: number;
  rate1LPaise: number;
  rate500mlPaise: number;
  rate250mlPaise: number;
  hasCustom1L: boolean;
  hasCustom500ml: boolean;
  hasCustom250ml: boolean;
  savedPkg1L: number;
  savedPkg500ml: number;
  savedPkg250ml: number;
  savedCashRupees?: number;
  savedUpiRupees?: number;
  savedReceivedRupees: number;
  savedRemarks: string;
  existingSaleIds: string[];
  existingPaymentIds: string[];
}

interface AdminEntryClientProps {
  initialData: {
    targetDate: string;
    customers: CustomerRowData[];
    prod1LId: string;
    prod500mlId: string;
    prod250mlId: string;
    prod1LRatePaise: number;
    prod500mlRatePaise: number;
    prod250mlRatePaise: number;
    daySummary: {
      totalSalesPaise: number;
      totalReceivedPaise: number;
      totalCashReceivedPaise?: number;
      totalUpiReceivedPaise?: number;
      netDuePaise: number;
      totalPKGs: number;
      accountsCount: number;
      totalCustomersCount: number;
    };
  };
  selectedDate: string;
}

interface RowState {
  pkg1L: number;
  pkg500ml: number;
  pkg250ml: number;
  cashAmount: string;
  upiAmount: string;
  remarks: string;
  isModified: boolean;
}

export default function AdminEntryClient({ initialData, selectedDate }: AdminEntryClientProps) {
  const [isPending, startTransition] = useTransition();

  // Search input ref for zero-mouse keyboard jumps
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Runtime customer list (allows adding new customers on the fly without page reload)
  const [customersList, setCustomersList] = useState<CustomerRowData[]>(initialData.customers);

  // Add Customer Modal State
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    customerName: '',
    firmName: '',
    code: '',
    category: 'A' as 'A' | 'B' | 'C',
    contact: '',
    routeName: '',
    areaName: '',
    address: '',
    openingDueRupees: '',
  });

  // Edit Customer Modal State
  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRowData | null>(null);
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
    customerName: '',
    firmName: '',
    code: '',
    contact: '',
    routeName: '',
    areaName: '',
    address: '',
    rate1LRupees: '',
    rate500mlRupees: '',
    rate250mlRupees: '',
  });

  const handleOpenEditModal = (c: CustomerRowData) => {
    setEditingCustomer(c);
    setEditCustomerForm({
      customerName: c.customerName,
      firmName: c.firmName || '',
      code: c.code || '',
      contact: c.contact === 'N/A' ? '' : c.contact,
      routeName: c.routeName,
      areaName: c.areaName,
      address: c.address || '',
      rate1LRupees: String(c.rate1LPaise / 100),
      rate500mlRupees: String(c.rate500mlPaise / 100),
      rate250mlRupees: String(c.rate250mlPaise / 100),
    });
    setEditCustomerModalOpen(true);
  };

  const handleSaveEditedCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editCustomerForm.customerName.trim()) {
      alert('Customer Name is required');
      return;
    }
    setIsUpdatingCustomer(true);
    try {
      const res = await quickUpdateAdminEntryCustomer({
        customerId: editingCustomer.id,
        customerName: editCustomerForm.customerName,
        firmName: editCustomerForm.firmName,
        code: editCustomerForm.code,
        contact: editCustomerForm.contact,
        routeName: editCustomerForm.routeName,
        areaName: editCustomerForm.areaName,
        address: editCustomerForm.address,
        rate1LRupees: editCustomerForm.rate1LRupees ? Number(editCustomerForm.rate1LRupees) : null,
        rate500mlRupees: editCustomerForm.rate500mlRupees ? Number(editCustomerForm.rate500mlRupees) : null,
        rate250mlRupees: editCustomerForm.rate250mlRupees ? Number(editCustomerForm.rate250mlRupees) : null,
      });

      if (res.error) {
        alert(res.error);
        return;
      }

      if (res.updatedData) {
        setCustomersList((prev) =>
          prev.map((item) => (item.id === editingCustomer.id ? { ...item, ...res.updatedData } : item))
        );
        setSuccessBanner(`Customer "${editCustomerForm.customerName}" updated successfully.`);
        setEditCustomerModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update customer');
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  // Delete / Clear Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRowData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenDeleteModal = (c: CustomerRowData) => {
    setDeletingCustomer(c);
    setDeleteModalOpen(true);
  };

  // Action 1: Clear row entry (and reverse today's transactions in DB if present)
  const handleClearRowEntry = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      const c = deletingCustomer;
      const hasSavedRecords = (c.existingSaleIds && c.existingSaleIds.length > 0) || (c.existingPaymentIds && c.existingPaymentIds.length > 0);
      
      if (hasSavedRecords) {
        const res = await deleteAdminEntryRowTransactions({
          customerId: c.id,
          targetDate: selectedDate,
          saleIds: c.existingSaleIds,
          paymentIds: c.existingPaymentIds,
        });
        if (res.error) {
          alert(res.error);
          return;
        }
      }

      // Reset client row state
      setRowsState((prev) => ({
        ...prev,
        [c.id]: {
          pkg1L: 0,
          pkg500ml: 0,
          pkg250ml: 0,
          cashAmount: '',
          upiAmount: '',
          remarks: '',
          isModified: false,
        },
      }));

      // Update customersList to clear saved transaction IDs
      setCustomersList((prev) =>
        prev.map((item) =>
          item.id === c.id
            ? {
                ...item,
                savedPkg1L: 0,
                savedPkg500ml: 0,
                savedPkg250ml: 0,
                savedCashRupees: 0,
                savedUpiRupees: 0,
                savedReceivedRupees: 0,
                savedRemarks: '',
                existingSaleIds: [],
                existingPaymentIds: [],
              }
            : item
        )
      );

      setSuccessBanner(`Today's entry for "${c.customerName}" cleared.`);
      setDeleteModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to clear entry');
    } finally {
      setIsDeleting(false);
    }
  };

  // Action 2: Delete / Deactivate Customer entirely
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      const res = await deleteAdminEntryCustomer(deletingCustomer.id);
      if (res.error) {
        alert(res.error);
        return;
      }

      setCustomersList((prev) => prev.filter((item) => item.id !== deletingCustomer.id));
      setSuccessBanner(`Customer "${deletingCustomer.customerName}" removed from register.`);
      setDeleteModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bottle Active / Inactive states (When Inactive, entry is completely blocked for that bottle size)
  const [bottleActive, setBottleActive] = useState<{
    pkg1L: boolean;
    pkg500ml: boolean;
    pkg250ml: boolean;
  }>({
    pkg1L: true,
    pkg500ml: true,
    pkg250ml: true,
  });

  const toggleBottle = (key: 'pkg1L' | 'pkg500ml' | 'pkg250ml') => {
    setBottleActive((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [showModifiedOnly, setShowModifiedOnly] = useState(false);

  // Status feedback
  const [isSaving, setIsSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Table rows editable state dictionary: customerId -> RowState
  const [rowsState, setRowsState] = useState<Record<string, RowState>>(() => {
    const initialMap: Record<string, RowState> = {};
    initialData.customers.forEach((c) => {
      const hasExplicitCash = c.savedCashRupees !== undefined && c.savedCashRupees > 0;
      const hasExplicitUpi = c.savedUpiRupees !== undefined && c.savedUpiRupees > 0;
      
      let cashVal = '';
      let upiVal = '';

      if (hasExplicitCash || hasExplicitUpi) {
        if (hasExplicitCash) cashVal = String(c.savedCashRupees);
        if (hasExplicitUpi) upiVal = String(c.savedUpiRupees);
      } else if (c.savedReceivedRupees > 0) {
        cashVal = String(c.savedReceivedRupees);
      }

      initialMap[c.id] = {
        pkg1L: c.savedPkg1L || 0,
        pkg500ml: c.savedPkg500ml || 0,
        pkg250ml: c.savedPkg250ml || 0,
        cashAmount: cashVal,
        upiAmount: upiVal,
        remarks: c.savedRemarks || '',
        isModified: false,
      };
    });
    return initialMap;
  });

  // Reset row state when switching dates
  useEffect(() => {
    setCustomersList(initialData.customers);
    const initialMap: Record<string, RowState> = {};
    initialData.customers.forEach((c) => {
      const hasExplicitCash = c.savedCashRupees !== undefined && c.savedCashRupees > 0;
      const hasExplicitUpi = c.savedUpiRupees !== undefined && c.savedUpiRupees > 0;
      
      let cashVal = '';
      let upiVal = '';

      if (hasExplicitCash || hasExplicitUpi) {
        if (hasExplicitCash) cashVal = String(c.savedCashRupees);
        if (hasExplicitUpi) upiVal = String(c.savedUpiRupees);
      } else if (c.savedReceivedRupees > 0) {
        cashVal = String(c.savedReceivedRupees);
      }

      initialMap[c.id] = {
        pkg1L: c.savedPkg1L || 0,
        pkg500ml: c.savedPkg500ml || 0,
        pkg250ml: c.savedPkg250ml || 0,
        cashAmount: cashVal,
        upiAmount: upiVal,
        remarks: c.savedRemarks || '',
        isModified: false,
      };
    });
    setRowsState(initialMap);
    setSuccessBanner(null);
    setErrorBanner(null);
  }, [initialData.targetDate, initialData.customers]);

  // Unique route list for filter & dropdowns
  const routeOptions = useMemo(() => {
    const set = new Set<string>();
    customersList.forEach((c) => {
      if (c.routeName) set.add(c.routeName);
    });
    return Array.from(set).sort();
  }, [customersList]);

  // Unique area list grouped by route
  const routeAreaMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    customersList.forEach((c) => {
      const r = c.routeName || 'Other';
      if (!map[r]) map[r] = new Set();
      if (c.areaName && c.areaName !== 'Unassigned') {
        map[r].add(c.areaName);
      }
    });
    const result: Record<string, string[]> = {};
    for (const k in map) {
      result[k] = Array.from(map[k]).sort();
    }
    return result;
  }, [customersList]);

  // All unique areas across territory
  const allAreaOptions = useMemo(() => {
    const set = new Set<string>();
    customersList.forEach((c) => {
      if (c.areaName && c.areaName !== 'Unassigned') {
        set.add(c.areaName);
      }
    });
    return Array.from(set).sort();
  }, [customersList]);

  // Custom route/area toggles for New & Edit Customer modals
  const [isCustomRoute, setIsCustomRoute] = useState(false);
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [isEditCustomRoute, setIsEditCustomRoute] = useState(false);
  const [isEditCustomArea, setIsEditCustomArea] = useState(false);

  // Handle cell changes
  const handleCellChange = useCallback((customerId: string, field: keyof RowState, value: any) => {
    setRowsState((prev) => {
      const current = prev[customerId] || {
        pkg1L: 0,
        pkg500ml: 0,
        pkg250ml: 0,
        cashAmount: '',
        upiAmount: '',
        remarks: '',
        isModified: false,
      };

      const updated = {
        ...current,
        [field]: value,
        isModified: true,
      };

      return {
        ...prev,
        [customerId]: updated,
      };
    });
    setSuccessBanner(null);
  }, []);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const row = rowsState[c.id];
      const cashVal = Number(row?.cashAmount) || 0;
      const upiVal = Number(row?.upiAmount) || 0;

      const p1 = bottleActive.pkg1L ? (row?.pkg1L || 0) : 0;
      const p5 = bottleActive.pkg500ml ? (row?.pkg500ml || 0) : 0;
      const p2 = bottleActive.pkg250ml ? (row?.pkg250ml || 0) : 0;

      if (showModifiedOnly && !row?.isModified && !(p1 > 0 || p5 > 0 || p2 > 0 || cashVal > 0 || upiVal > 0)) {
        return false;
      }
      if (selectedRoute !== 'ALL' && c.routeName !== selectedRoute) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = c.customerName.toLowerCase().includes(q);
        const matchesCode = c.code ? c.code.toLowerCase().includes(q) : false;
        const matchesFirm = c.firmName ? c.firmName.toLowerCase().includes(q) : false;
        const matchesArea = c.areaName.toLowerCase().includes(q);
        const matchesRoute = c.routeName.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesFirm || matchesArea || matchesRoute;
      }
      return true;
    });
  }, [customersList, rowsState, showModifiedOnly, selectedRoute, searchTerm, bottleActive]);

  // Calculate live modified rows count
  const modifiedCount = useMemo(() => {
    return Object.values(rowsState).filter((r) => r.isModified).length;
  }, [rowsState]);

  // Comprehensive calculations: Overall Grand Totals, Route-wise Summaries, and Filtered View Totals
  const { liveTotals, routeSummaries, filteredTotals } = useMemo(() => {
    let grandTotal1L = 0;
    let grandTotal500ml = 0;
    let grandTotal250ml = 0;
    let grandTotalBillPaise = 0;
    let grandTotalCashPaise = 0;
    let grandTotalUpiPaise = 0;
    let grandTotalReceivedPaise = 0;
    let grandTotalRemainingDuePaise = 0;
    let grandActiveAccounts = 0;

    const routeMap: Record<string, {
      routeName: string;
      total1L: number;
      total500ml: number;
      total250ml: number;
      totalPKGs: number;
      billPaise: number;
      cashPaise: number;
      upiPaise: number;
      receivedPaise: number;
      remainingDuePaise: number;
      activeAccounts: number;
      totalCustomers: number;
    }> = {};

    customersList.forEach((c) => {
      const state = rowsState[c.id] || {
        pkg1L: c.savedPkg1L || 0,
        pkg500ml: c.savedPkg500ml || 0,
        pkg250ml: c.savedPkg250ml || 0,
        cashAmount: '',
        upiAmount: '',
        remarks: c.savedRemarks || '',
        isModified: false,
      };

      const p1 = bottleActive.pkg1L ? state.pkg1L : 0;
      const p5 = bottleActive.pkg500ml ? state.pkg500ml : 0;
      const p2 = bottleActive.pkg250ml ? state.pkg250ml : 0;

      const billPaise = 
        p1 * c.rate1LPaise +
        p5 * c.rate500mlPaise +
        p2 * c.rate250mlPaise;

      const cashRupees = Number(state.cashAmount) || 0;
      const upiRupees = Number(state.upiAmount) || 0;
      const cashPaise = Math.round(cashRupees * 100);
      const upiPaise = Math.round(upiRupees * 100);
      const receivedPaise = cashPaise + upiPaise;
      const remainingDuePaise = c.previousDuePaise + billPaise - receivedPaise;

      grandTotal1L += p1;
      grandTotal500ml += p5;
      grandTotal250ml += p2;
      grandTotalBillPaise += billPaise;
      grandTotalCashPaise += cashPaise;
      grandTotalUpiPaise += upiPaise;
      grandTotalReceivedPaise += receivedPaise;
      grandTotalRemainingDuePaise += remainingDuePaise;

      const isActive = billPaise > 0 || receivedPaise > 0;
      if (isActive) {
        grandActiveAccounts++;
      }

      const rName = c.routeName || 'Direct / Unassigned';
      if (!routeMap[rName]) {
        routeMap[rName] = {
          routeName: rName,
          total1L: 0,
          total500ml: 0,
          total250ml: 0,
          totalPKGs: 0,
          billPaise: 0,
          cashPaise: 0,
          upiPaise: 0,
          receivedPaise: 0,
          remainingDuePaise: 0,
          activeAccounts: 0,
          totalCustomers: 0,
        };
      }
      const r = routeMap[rName];
      r.total1L += p1;
      r.total500ml += p5;
      r.total250ml += p2;
      r.totalPKGs += (p1 + p5 + p2);
      r.billPaise += billPaise;
      r.cashPaise += cashPaise;
      r.upiPaise += upiPaise;
      r.receivedPaise += receivedPaise;
      r.remainingDuePaise += remainingDuePaise;
      r.totalCustomers++;
      if (isActive) r.activeAccounts++;
    });

    // Totals for the currently filtered view
    let filt1L = 0;
    let filt500ml = 0;
    let filt250ml = 0;
    let filtBillPaise = 0;
    let filtCashPaise = 0;
    let filtUpiPaise = 0;
    let filtReceivedPaise = 0;
    let filtRemainingDuePaise = 0;
    let filtActiveAccounts = 0;

    filteredCustomers.forEach((c) => {
      const state = rowsState[c.id];
      const p1 = bottleActive.pkg1L ? (state?.pkg1L || 0) : 0;
      const p5 = bottleActive.pkg500ml ? (state?.pkg500ml || 0) : 0;
      const p2 = bottleActive.pkg250ml ? (state?.pkg250ml || 0) : 0;

      const billPaise = 
        p1 * c.rate1LPaise +
        p5 * c.rate500mlPaise +
        p2 * c.rate250mlPaise;
      const cashPaise = Math.round((Number(state?.cashAmount) || 0) * 100);
      const upiPaise = Math.round((Number(state?.upiAmount) || 0) * 100);
      const receivedPaise = cashPaise + upiPaise;
      const remainingDuePaise = c.previousDuePaise + billPaise - receivedPaise;

      filt1L += p1;
      filt500ml += p5;
      filt250ml += p2;
      filtBillPaise += billPaise;
      filtCashPaise += cashPaise;
      filtUpiPaise += upiPaise;
      filtReceivedPaise += receivedPaise;
      filtRemainingDuePaise += remainingDuePaise;
      if (billPaise > 0 || receivedPaise > 0) filtActiveAccounts++;
    });

    return {
      liveTotals: {
        total1L: grandTotal1L,
        total500ml: grandTotal500ml,
        total250ml: grandTotal250ml,
        totalPKGs: grandTotal1L + grandTotal500ml + grandTotal250ml,
        grandTotalBillPaise,
        grandTotalCashPaise,
        grandTotalUpiPaise,
        grandTotalReceivedPaise,
        grandTotalRemainingDuePaise,
        activeAccounts: grandActiveAccounts,
      },
      routeSummaries: Object.values(routeMap).sort((a, b) => b.billPaise - a.billPaise || a.routeName.localeCompare(b.routeName)),
      filteredTotals: {
        total1L: filt1L,
        total500ml: filt500ml,
        total250ml: filt250ml,
        totalPKGs: filt1L + filt500ml + filt250ml,
        billPaise: filtBillPaise,
        cashPaise: filtCashPaise,
        upiPaise: filtUpiPaise,
        receivedPaise: filtReceivedPaise,
        remainingDuePaise: filtRemainingDuePaise,
        activeAccounts: filtActiveAccounts,
        count: filteredCustomers.length,
      }
    };
  }, [customersList, rowsState, filteredCustomers, bottleActive]);

  // Helper: Find next active column for smooth keyboard navigation
  const getNextActiveCol = (currentCol: number): number | null => {
    for (let c = currentCol + 1; c <= 6; c++) {
      if (c === 1 && !bottleActive.pkg1L) continue;
      if (c === 2 && !bottleActive.pkg500ml) continue;
      if (c === 3 && !bottleActive.pkg250ml) continue;
      return c;
    }
    return null; // Reached past the last active column -> jump to Search!
  };

  const getFirstActiveCol = (): number => {
    if (bottleActive.pkg1L) return 1;
    if (bottleActive.pkg500ml) return 2;
    if (bottleActive.pkg250ml) return 3;
    return 4; // Cash
  };

  // Complete Keyboard Navigation: Zero Mouse Required
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    // 1. Esc or Shift+Enter immediately jumps back to Search box!
    if (e.key === 'Escape' || (e.key === 'Enter' && e.shiftKey)) {
      e.preventDefault();
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
      return;
    }

    // 2. Enter moves from left-to-right across active inputs: 1L -> 500ml -> 250ml -> Cash -> UPI -> Remarks
    // When finishing on Remarks or the last active column, Enter jumps straight back to Search!
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextCol = getNextActiveCol(colIndex);
      if (nextCol === null) {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }

      // Move to next active column in the same customer row
      const nextColInput = document.querySelector<HTMLInputElement>(
        `input[data-row="${rowIndex}"][data-col="${nextCol}"]`
      );
      if (nextColInput) {
        nextColInput.focus();
        nextColInput.select();
      } else {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    } else if (e.key === 'ArrowDown') {
      // Down arrow moves down the same column across rows (great for fast bulk column-filling)
      e.preventDefault();
      const nextRowInput = document.querySelector<HTMLInputElement>(
        `input[data-row="${rowIndex + 1}"][data-col="${colIndex}"]`
      );
      if (nextRowInput) {
        nextRowInput.focus();
        nextRowInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRowInput = document.querySelector<HTMLInputElement>(
        `input[data-row="${rowIndex - 1}"][data-col="${colIndex}"]`
      );
      if (prevRowInput) {
        prevRowInput.focus();
        prevRowInput.select();
      } else {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
  };

  // Handle Quick Adding New Customer Runtime
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.customerName.trim()) {
      setErrorBanner('Customer Name is required');
      return;
    }
    if (!newCustomerForm.routeName.trim()) {
      setErrorBanner('Route is required');
      return;
    }
    if (!newCustomerForm.areaName.trim()) {
      setErrorBanner('Area is required');
      return;
    }

    setIsCreatingCustomer(true);
    setErrorBanner(null);

    try {
      const res = await quickCreateAdminEntryCustomer({
        customerName: newCustomerForm.customerName.trim(),
        firmName: newCustomerForm.firmName.trim() || undefined,
        code: newCustomerForm.code.trim() || undefined,
        category: newCustomerForm.category || 'A',
        routeName: newCustomerForm.routeName.trim(),
        areaName: newCustomerForm.areaName.trim(),
        address: newCustomerForm.address.trim() || undefined,
        contact: newCustomerForm.contact.trim() || undefined,
        openingDueRupees: Number(newCustomerForm.openingDueRupees) || 0,
      });

      if (res?.error) {
        setErrorBanner(res.error);
      } else if (res?.customer) {
        const newCust = res.customer;
        // Prepend to customer list immediately
        setCustomersList((prev) => [newCust, ...prev]);

        // Initialize state for new customer
        setRowsState((prev) => ({
          ...prev,
          [newCust.id]: {
            pkg1L: 0,
            pkg500ml: 0,
            pkg250ml: 0,
            cashAmount: '',
            upiAmount: '',
            remarks: '',
            isModified: true,
          },
        }));

        setAddCustomerModalOpen(false);
        setNewCustomerForm({
          customerName: '',
          firmName: '',
          code: '',
          category: 'A',
          contact: '',
          routeName: '',
          areaName: '',
          address: '',
          openingDueRupees: '',
        });
        setSuccessBanner(`Customer "${newCust.customerName}" created! You can now record their bottles & collections.`);
        setSearchTerm(newCust.customerName);

        setTimeout(() => {
          const firstCol = getFirstActiveCol();
          const firstInput = document.querySelector<HTMLInputElement>(
            `input[data-row="0"][data-col="${firstCol}"]`
          );
          firstInput?.focus();
          firstInput?.select();
        }, 150);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to create customer');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Save All Modified Entries in Batch
  const handleSaveAll = useCallback(async () => {
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsSaving(true);

    try {
      const payloadEntries = customersList.map((c) => {
        const state = rowsState[c.id];
        const p1 = bottleActive.pkg1L ? (Number(state?.pkg1L) || 0) : 0;
        const p5 = bottleActive.pkg500ml ? (Number(state?.pkg500ml) || 0) : 0;
        const p2 = bottleActive.pkg250ml ? (Number(state?.pkg250ml) || 0) : 0;

        const cashAmount = Number(state?.cashAmount) || 0;
        const upiAmount = Number(state?.upiAmount) || 0;
        return {
          customerId: c.id,
          pkg1L: p1,
          pkg500ml: p5,
          pkg250ml: p2,
          cashAmount,
          upiAmount,
          receivedAmount: cashAmount + upiAmount,
          remarks: state?.remarks || '',
          existingSaleIds: c.existingSaleIds,
          existingPaymentIds: c.existingPaymentIds,
          isModified: Boolean(state?.isModified),
        };
      });

      const res = await saveAdminEntryBatch({
        date: initialData.targetDate,
        entries: payloadEntries,
      });

      if (res?.error) {
        setErrorBanner(res.error);
      } else {
        setSuccessBanner(`Batch updated successfully! Saved ${res?.savedCount ?? modifiedCount} accounts.`);
        // Mark all rows as not modified
        setRowsState((prev) => {
          const nextState: Record<string, RowState> = {};
          Object.entries(prev).forEach(([k, v]) => {
            nextState[k] = { ...v, isModified: false };
          });
          return nextState;
        });
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to save batch entries');
    } finally {
      setIsSaving(false);
    }
  }, [customersList, initialData.targetDate, rowsState, modifiedCount, bottleActive]);

  // Global Keyboard Shortcuts (Ctrl+S to save, Ctrl+K / Ctrl+F / / to search)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S to Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAll();
        return;
      }

      // Ctrl+K or Ctrl+F to jump to Search
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Pressing '/' outside of an active input focuses search
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSaveAll]);

  // Discard all changes
  const handleDiscardChanges = () => {
    if (!confirm('Discard all unsaved edits for this date?')) return;
    const initialMap: Record<string, RowState> = {};
    customersList.forEach((c) => {
      const hasExplicitCash = c.savedCashRupees !== undefined && c.savedCashRupees > 0;
      const hasExplicitUpi = c.savedUpiRupees !== undefined && c.savedUpiRupees > 0;
      
      let cashVal = '';
      let upiVal = '';

      if (hasExplicitCash || hasExplicitUpi) {
        if (hasExplicitCash) cashVal = String(c.savedCashRupees);
        if (hasExplicitUpi) upiVal = String(c.savedUpiRupees);
      } else if (c.savedReceivedRupees > 0) {
        cashVal = String(c.savedReceivedRupees);
      }

      initialMap[c.id] = {
        pkg1L: c.savedPkg1L || 0,
        pkg500ml: c.savedPkg500ml || 0,
        pkg250ml: c.savedPkg250ml || 0,
        cashAmount: cashVal,
        upiAmount: upiVal,
        remarks: c.savedRemarks || '',
        isModified: false,
      };
    });
    setRowsState(initialMap);
    setSuccessBanner(null);
    setErrorBanner(null);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header with Title & Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-primary">
              Admin Entry
            </h1>
          </div>
          <p className="text-xs text-secondary mt-1">
            Register-style daily sales and collections entry sheet for all {customersList.length} customer accounts.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
              Entry Date
            </span>
            <span className="text-xs font-bold text-primary font-sans tabular-nums">
              {initialData.targetDate}
            </span>
          </div>
          <AdminDatePicker 
            currentDate={initialData.targetDate} 
            basePath="/dashboard/admin/entry" 
          />
        </div>
      </div>

      {/* 2. Overall Grand Totals (Always visible on top) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Day's Total Sales
          </span>
          <div className="text-lg sm:text-xl font-black text-primary font-sans tabular-nums mt-0.5">
            {formatMoney(liveTotals.grandTotalBillPaise)}
          </div>
        </div>

        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Collections Received
          </span>
          <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 font-sans tabular-nums mt-0.5">
            {formatMoney(liveTotals.grandTotalReceivedPaise)}
          </div>
          <div className="text-[10px] font-bold text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-800 dark:text-emerald-300">Cash: {formatMoney(liveTotals.grandTotalCashPaise)}</span>
            <span>•</span>
            <span className="text-sky-800 dark:text-sky-300">UPI: {formatMoney(liveTotals.grandTotalUpiPaise)}</span>
          </div>
        </div>

        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Net Due / Remaining
          </span>
          <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-400 font-sans tabular-nums mt-0.5">
            {formatMoney(liveTotals.grandTotalRemainingDuePaise)}
          </div>
        </div>

        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Total Packages Sold
          </span>
          <div className="text-lg sm:text-xl font-black text-primary font-sans tabular-nums mt-0.5">
            {formatNumber(liveTotals.totalPKGs)} <span className="text-xs font-normal text-secondary">PKGs</span>
          </div>
          <div className="text-[10px] font-bold text-secondary mt-0.5 truncate">
            1L: {bottleActive.pkg1L ? liveTotals.total1L : 'Off'} • 500: {bottleActive.pkg500ml ? liveTotals.total500ml : 'Off'} • 250: {bottleActive.pkg250ml ? liveTotals.total250ml : 'Off'}
          </div>
        </div>

        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-xl p-3 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary block">
            Accounts Active / Total
          </span>
          <div className="text-lg sm:text-xl font-black text-primary font-sans tabular-nums mt-0.5">
            {liveTotals.activeAccounts} <span className="text-xs font-normal text-secondary">/ {customersList.length}</span>
          </div>
        </div>
      </div>

      {/* 3. Route-Wise Bottles & Hisab Breakdown Bar */}
      {routeSummaries.length > 0 && (
        <div className="bg-surface-raised border border-border-default shadow-raised-sm rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Route-Wise Bottles & Hisab
              </span>
              <span className="text-[11px] text-muted">
                (Click any route to filter register below)
              </span>
            </div>
            {selectedRoute !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedRoute('ALL')}
                className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Reset to All Routes</span>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* "All Routes" Pill Card */}
            <div
              onClick={() => setSelectedRoute('ALL')}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                selectedRoute === 'ALL'
                  ? 'bg-primary/5 border-primary shadow-raised-sm ring-1 ring-primary'
                  : 'bg-surface-inset border-border-default hover:border-primary/50 hover:bg-surface-raised'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">All Routes Total</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  selectedRoute === 'ALL'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-raised border border-border-default text-secondary'
                }`}>
                  {liveTotals.activeAccounts} / {customersList.length}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-base font-black text-primary font-sans tabular-nums">
                  {formatNumber(liveTotals.totalPKGs)} <span className="text-xs font-medium text-secondary">PKGs</span>
                </span>
                <span className="text-sm font-bold text-teal-800 dark:text-teal-300 font-sans tabular-nums">
                  {formatMoney(liveTotals.grandTotalBillPaise)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-secondary font-medium">
                <span>1L: {liveTotals.total1L} • 500: {liveTotals.total500ml} • 250: {liveTotals.total250ml}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Rcvd: {formatMoney(liveTotals.grandTotalReceivedPaise)}</span>
              </div>
            </div>

            {/* Individual Route Cards */}
            {routeSummaries.map((r) => {
              const isSelected = selectedRoute === r.routeName;
              return (
                <div
                  key={r.routeName}
                  onClick={() => setSelectedRoute(isSelected ? 'ALL' : r.routeName)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-raised-sm ring-1 ring-primary'
                      : 'bg-surface-inset border-border-default hover:border-primary/50 hover:bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary truncate max-w-[140px]" title={r.routeName}>
                      {r.routeName}
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-surface-raised border border-border-default text-secondary'
                    }`}>
                      {r.activeAccounts} / {r.totalCustomers}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-base font-black text-primary font-sans tabular-nums">
                      {formatNumber(r.totalPKGs)} <span className="text-xs font-medium text-secondary">PKGs</span>
                    </span>
                    <span className="text-sm font-bold text-teal-800 dark:text-teal-300 font-sans tabular-nums">
                      {formatMoney(r.billPaise)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-secondary font-medium">
                    <span>1L: {r.total1L} • 500: {r.total500ml} • 250: {r.total250ml}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      {r.cashPaise > 0 || r.upiPaise > 0 
                        ? `C:${formatMoney(r.cashPaise)} U:${formatMoney(r.upiPaise)}`
                        : `Rcvd: ${formatMoney(r.receivedPaise)}`
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Action Bar, Filter Controls, Bottle Line Toggles & Save All Button */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {/* Quick Search with Zero-Mouse Enter jump and One-Click Clear Button */}
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search customer, code, route... (Enter to start entry)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setSearchTerm('');
                  return;
                }
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const firstCol = getFirstActiveCol();
                  const firstInput = document.querySelector<HTMLInputElement>(
                    `input[data-row="0"][data-col="${firstCol}"]`
                  );
                  if (firstInput) {
                    firstInput.focus();
                    firstInput.select();
                  }
                }
              }}
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-surface-inset border border-border-default text-xs font-semibold text-primary placeholder:text-muted focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface-raised text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Route Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-surface-inset border border-border-default text-primary cursor-pointer outline-none focus:border-teal-500"
            >
              <option value="ALL">All Routes ({routeOptions.length})</option>
              {routeOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Bottle Line Active/Inactive Toggles */}
          <div className="inline-flex items-center gap-1 p-1 bg-surface-inset border border-border-default rounded-xl text-xs font-bold">
            <span className="text-[10px] text-secondary font-black px-1.5 uppercase tracking-wider">Lines:</span>
            
            <button
              type="button"
              onClick={() => toggleBottle('pkg1L')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                bottleActive.pkg1L 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-surface-raised border border-border-default text-muted line-through'
              }`}
              title={bottleActive.pkg1L ? "1 Litre Active — Click to disable" : "1 Litre Inactive — Click to enable"}
            >
              1L {bottleActive.pkg1L ? '✓' : 'Off'}
            </button>

            <button
              type="button"
              onClick={() => toggleBottle('pkg500ml')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                bottleActive.pkg500ml 
                  ? 'bg-teal-600 text-white shadow-xs' 
                  : 'bg-surface-raised border border-border-default text-muted line-through'
              }`}
              title={bottleActive.pkg500ml ? "500 ml Active — Click to disable" : "500 ml Inactive — Click to enable"}
            >
              500ml {bottleActive.pkg500ml ? '✓' : 'Off'}
            </button>

            <button
              type="button"
              onClick={() => toggleBottle('pkg250ml')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                bottleActive.pkg250ml 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-surface-raised border border-border-default text-muted line-through'
              }`}
              title={bottleActive.pkg250ml ? "250 ml Active — Click to disable" : "250 ml Inactive — Click to enable"}
            >
              250ml {bottleActive.pkg250ml ? '✓' : 'Off'}
            </button>
          </div>

          {/* Show Active Only Toggle */}
          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary cursor-pointer px-2 py-1 rounded-lg hover:bg-surface-inset transition-colors">
            <input
              type="checkbox"
              checked={showModifiedOnly}
              onChange={(e) => setShowModifiedOnly(e.target.checked)}
              className="rounded border-border-default text-teal-600 focus:ring-teal-500"
            />
            <span>Active Only ({liveTotals.activeAccounts})</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Add Customer Runtime Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNewCustomerForm((prev) => ({
                ...prev,
                customerName: searchTerm.trim(),
              }));
              setAddCustomerModalOpen(true);
            }}
            leftIcon={<UserPlus className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
            className="font-bold border-teal-600/30 text-teal-800 dark:text-teal-300 hover:bg-teal-500/10 shadow-raised-sm"
          >
            + New Customer
          </Button>

          {modifiedCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={isSaving}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Discard
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            disabled={isSaving || modifiedCount === 0}
            isLoading={isSaving}
            leftIcon={<Save className="h-4 w-4" />}
            className="shadow-md hover:shadow-lg font-bold"
          >
            {modifiedCount > 0 ? `Save All Entries (${modifiedCount})` : 'Save All Entries'}
          </Button>
        </div>
      </div>

      {/* Keyboard Shortcut Notice */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-secondary px-2">
        <Keyboard className="h-3 w-3 text-primary shrink-0" />
        <span>Keyboard: Search customer → [Enter] to fill row → [Enter] on last field / [Shift+Enter] jumps back to search. [Ctrl+S] saves batch.</span>
      </div>

      {/* Banners */}
      {successBanner && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-scale-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-scale-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* 5. MAIN REGISTER TABLE */}
      <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-xs">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-20 bg-surface-sidebar/95 backdrop-blur-xs border-b border-border-default shadow-xs text-secondary font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center border-r border-border-default/50">
                  S. No.
                </th>
                <th className="py-2.5 px-3 min-w-[200px] max-w-[240px] sticky left-0 z-20 bg-surface-sidebar border-r border-border-default/50">
                  Customer Name
                </th>
                <th className="py-2.5 px-3 min-w-[150px] border-r border-border-default/50">
                  Area / Route
                </th>
                <th className="py-2.5 px-3 min-w-[110px] text-right border-r border-border-default/50">
                  Previous Due (₹)
                </th>

                {/* 1 Litre Header with Active/Inactive Toggle */}
                <th className={`py-2 px-2.5 min-w-[110px] text-center border-r border-border-default/50 transition-colors ${
                  bottleActive.pkg1L ? 'bg-blue-500/5' : 'bg-surface-inset/60 opacity-60'
                }`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>1 Litre</span>
                    <button
                      type="button"
                      onClick={() => toggleBottle('pkg1L')}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        bottleActive.pkg1L 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30'
                      }`}
                      title={bottleActive.pkg1L ? "Click to set 1L Inactive" : "Click to set 1L Active"}
                    >
                      {bottleActive.pkg1L ? 'Active' : 'Off'}
                    </button>
                  </div>
                  <div className="text-[9px] font-bold text-blue-700 dark:text-blue-300 normal-case mt-0.5">
                    {bottleActive.pkg1L ? `avg ₹${initialData.prod1LRatePaise / 100}` : 'Disabled'}
                  </div>
                </th>

                {/* 500 ml Header with Active/Inactive Toggle */}
                <th className={`py-2 px-2.5 min-w-[110px] text-center border-r border-border-default/50 transition-colors ${
                  bottleActive.pkg500ml ? 'bg-teal-500/5' : 'bg-surface-inset/60 opacity-60'
                }`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>500 ml</span>
                    <button
                      type="button"
                      onClick={() => toggleBottle('pkg500ml')}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        bottleActive.pkg500ml 
                          ? 'bg-teal-600 text-white hover:bg-teal-700' 
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30'
                      }`}
                      title={bottleActive.pkg500ml ? "Click to set 500ml Inactive" : "Click to set 500ml Active"}
                    >
                      {bottleActive.pkg500ml ? 'Active' : 'Off'}
                    </button>
                  </div>
                  <div className="text-[9px] font-bold text-teal-700 dark:text-teal-300 normal-case mt-0.5">
                    {bottleActive.pkg500ml ? `avg ₹${initialData.prod500mlRatePaise / 100}` : 'Disabled'}
                  </div>
                </th>

                {/* 250 ml Header with Active/Inactive Toggle */}
                <th className={`py-2 px-2.5 min-w-[110px] text-center border-r border-border-default/50 transition-colors ${
                  bottleActive.pkg250ml ? 'bg-amber-500/5' : 'bg-surface-inset/60 opacity-60'
                }`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>250 ml</span>
                    <button
                      type="button"
                      onClick={() => toggleBottle('pkg250ml')}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        bottleActive.pkg250ml 
                          ? 'bg-amber-600 text-white hover:bg-amber-700' 
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30'
                      }`}
                      title={bottleActive.pkg250ml ? "Click to set 250ml Inactive" : "Click to set 250ml Active"}
                    >
                      {bottleActive.pkg250ml ? 'Active' : 'Off'}
                    </button>
                  </div>
                  <div className="text-[9px] font-bold text-amber-700 dark:text-amber-300 normal-case mt-0.5">
                    {bottleActive.pkg250ml ? `avg ₹${initialData.prod250mlRatePaise / 100}` : 'Disabled'}
                  </div>
                </th>

                <th className="py-2.5 px-3 min-w-[110px] text-right border-r border-border-default/50 bg-teal-500/10 text-teal-900 dark:text-teal-200">
                  Total Bill (₹)
                </th>
                <th className="py-2.5 px-2 text-right border-r border-border-default/50 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200 min-w-[95px]">
                  Cash (₹)
                </th>
                <th className="py-2.5 px-2 text-right border-r border-border-default/50 bg-sky-500/5 text-sky-900 dark:text-sky-200 min-w-[95px]">
                  UPI (₹)
                </th>
                <th className="py-2.5 px-3 min-w-[105px] text-right border-r border-border-default/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                  Total Rcvd (₹)
                </th>
                <th className="py-2.5 px-3 min-w-[120px] text-right border-r border-border-default/50 font-black">
                  Remaining Due (₹)
                </th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-border-default/50">
                  Remarks
                </th>
                <th className="py-2.5 px-3 min-w-[100px] text-center sticky right-0 z-20 bg-surface-sidebar shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body: All Customer Rows */}
            <tbody className="divide-y divide-border-default/50 font-sans">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-secondary text-sm">
                    <div className="space-y-3">
                      <p>No customer found matching &quot;{searchTerm}&quot;.</p>
                      {searchTerm.trim() && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setNewCustomerForm((prev) => ({
                              ...prev,
                              customerName: searchTerm.trim(),
                            }));
                            setAddCustomerModalOpen(true);
                          }}
                          leftIcon={<UserPlus className="h-4 w-4" />}
                          className="font-bold shadow-raised"
                        >
                          + Quick Add &quot;{searchTerm.trim()}&quot; as New Customer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => {
                  const state = rowsState[c.id] || {
                    pkg1L: 0,
                    pkg500ml: 0,
                    pkg250ml: 0,
                    cashAmount: '',
                    upiAmount: '',
                    remarks: '',
                    isModified: false,
                  };

                  const p1 = bottleActive.pkg1L ? state.pkg1L : 0;
                  const p5 = bottleActive.pkg500ml ? state.pkg500ml : 0;
                  const p2 = bottleActive.pkg250ml ? state.pkg250ml : 0;

                  const billPaise = 
                    p1 * c.rate1LPaise +
                    p5 * c.rate500mlPaise +
                    p2 * c.rate250mlPaise;

                  const cashRupees = Number(state.cashAmount) || 0;
                  const upiRupees = Number(state.upiAmount) || 0;
                  const cashPaise = Math.round(cashRupees * 100);
                  const upiPaise = Math.round(upiRupees * 100);
                  const receivedPaise = cashPaise + upiPaise;
                  const remainingDuePaise = c.previousDuePaise + billPaise - receivedPaise;

                  const isRowActive = p1 > 0 || p5 > 0 || p2 > 0 || receivedPaise > 0;

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors duration-150 hover:bg-surface-inset/60 ${
                        state.isModified ? 'bg-amber-500/5' : isRowActive ? 'bg-teal-500/[0.02]' : ''
                      }`}
                    >
                      {/* S. No. */}
                      <td className="py-2 px-3 text-center text-secondary font-medium border-r border-border-default/40">
                        {idx + 1}
                      </td>

                      {/* Customer Name (Sticky Left Column) */}
                      <td className="py-2 px-3 sticky left-0 z-10 bg-surface-raised border-r border-border-default/40 min-w-[200px] max-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/dashboard/admin/customers/${c.id}`}
                            className="font-bold text-primary hover:text-teal-700 dark:hover:text-teal-300 hover:underline truncate"
                            title={c.customerName}
                          >
                            {c.customerName}
                          </Link>
                          {state.isModified && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
                          )}
                        </div>
                        {c.firmName && (
                          <div className="text-[10px] text-secondary truncate" title={c.firmName}>
                            {c.firmName}
                          </div>
                        )}
                        {c.code && (
                          <div className="text-[9px] text-muted font-bold tracking-tight">
                            #{c.code}
                          </div>
                        )}
                      </td>

                      {/* Area / Route */}
                      <td className="py-2 px-3 text-secondary border-r border-border-default/40 min-w-[150px]">
                        <div className="font-semibold text-primary truncate max-w-[150px]">
                          {c.areaName}
                        </div>
                        <div className="text-[10px] text-muted truncate max-w-[150px]">
                          {c.routeName}
                        </div>
                      </td>

                      {/* Previous Due (₹) */}
                      <td className={`py-2 px-3 text-right tabular-nums font-bold border-r border-border-default/40 ${
                        c.previousDuePaise > 0 
                          ? 'text-amber-800 dark:text-amber-300' 
                          : c.previousDuePaise < 0 
                          ? 'text-emerald-700 dark:text-emerald-400' 
                          : 'text-secondary'
                      }`}>
                        {formatMoney(c.previousDuePaise)}
                      </td>

                      {/* 1 Litre (PKGs) */}
                      <td className={`py-1.5 px-2 text-center border-r border-border-default/40 transition-colors ${
                        bottleActive.pkg1L ? 'bg-blue-500/5' : 'bg-surface-inset/30 opacity-40 select-none'
                      }`}>
                        {bottleActive.pkg1L ? (
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              data-row={idx}
                              data-col={1}
                              value={state.pkg1L === 0 ? '' : state.pkg1L}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                handleCellChange(c.id, 'pkg1L', val);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                              placeholder="0"
                              className="w-16 text-center py-1 px-1.5 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none tabular-nums"
                            />
                            <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                              @ ₹{c.rate1LPaise / 100}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-1">
                            <span className="text-xs font-bold text-muted">—</span>
                            <span className="text-[8px] font-black uppercase text-rose-500/80">Off</span>
                          </div>
                        )}
                      </td>

                      {/* 500 ml (PKGs) */}
                      <td className={`py-1.5 px-2 text-center border-r border-border-default/40 transition-colors ${
                        bottleActive.pkg500ml ? 'bg-teal-500/5' : 'bg-surface-inset/30 opacity-40 select-none'
                      }`}>
                        {bottleActive.pkg500ml ? (
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              data-row={idx}
                              data-col={2}
                              value={state.pkg500ml === 0 ? '' : state.pkg500ml}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                handleCellChange(c.id, 'pkg500ml', val);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                              placeholder="0"
                              className="w-16 text-center py-1 px-1.5 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-primary focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none tabular-nums"
                            />
                            <span className="text-[9px] font-bold text-teal-700 dark:text-teal-300 mt-0.5">
                              @ ₹{c.rate500mlPaise / 100}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-1">
                            <span className="text-xs font-bold text-muted">—</span>
                            <span className="text-[8px] font-black uppercase text-rose-500/80">Off</span>
                          </div>
                        )}
                      </td>

                      {/* 250 ml (PKGs) */}
                      <td className={`py-1.5 px-2 text-center border-r border-border-default/40 transition-colors ${
                        bottleActive.pkg250ml ? 'bg-amber-500/5' : 'bg-surface-inset/30 opacity-40 select-none'
                      }`}>
                        {bottleActive.pkg250ml ? (
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              data-row={idx}
                              data-col={3}
                              value={state.pkg250ml === 0 ? '' : state.pkg250ml}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                handleCellChange(c.id, 'pkg250ml', val);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                              placeholder="0"
                              className="w-16 text-center py-1 px-1.5 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-primary focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none tabular-nums"
                            />
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                              @ ₹{c.rate250mlPaise / 100}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-1">
                            <span className="text-xs font-bold text-muted">—</span>
                            <span className="text-[8px] font-black uppercase text-rose-500/80">Off</span>
                          </div>
                        )}
                      </td>

                      {/* Total Bill (₹) — Calculated Live */}
                      <td className="py-2 px-3 text-right tabular-nums font-black border-r border-border-default/40 bg-teal-500/10 text-teal-900 dark:text-teal-200">
                        {formatMoney(billPaise)}
                      </td>

                      {/* Cash (₹) */}
                      <td className="py-1.5 px-2 text-right border-r border-border-default/40 bg-emerald-500/5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          data-row={idx}
                          data-col={4}
                          value={state.cashAmount}
                          onChange={(e) => handleCellChange(c.id, 'cashAmount', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                          placeholder="0"
                          className="w-20 text-right py-1 px-2 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-emerald-800 dark:text-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums"
                        />
                      </td>

                      {/* UPI (₹) */}
                      <td className="py-1.5 px-2 text-right border-r border-border-default/40 bg-sky-500/5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          data-row={idx}
                          data-col={5}
                          value={state.upiAmount}
                          onChange={(e) => handleCellChange(c.id, 'upiAmount', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 5)}
                          placeholder="0"
                          className="w-20 text-right py-1 px-2 rounded-lg bg-surface-inset border border-border-default text-xs font-bold text-sky-800 dark:text-sky-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none tabular-nums"
                        />
                      </td>

                      {/* Total Rcvd (₹) — Calculated Live */}
                      <td className="py-2 px-3 text-right tabular-nums font-black border-r border-border-default/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                        {formatMoney(receivedPaise)}
                      </td>

                      {/* Remaining Due (₹) — Calculated Live */}
                      <td className={`py-2 px-3 text-right tabular-nums font-black border-r border-border-default/40 ${
                        remainingDuePaise > 0 
                          ? 'text-amber-800 dark:text-amber-300' 
                          : remainingDuePaise < 0 
                          ? 'text-emerald-700 dark:text-emerald-400' 
                          : 'text-secondary'
                      }`}>
                        {formatMoney(remainingDuePaise)}
                      </td>

                      {/* Remarks */}
                      <td className="py-1.5 px-2 border-r border-border-default/40">
                        <input
                          type="text"
                          data-row={idx}
                          data-col={6}
                          value={state.remarks}
                          onChange={(e) => handleCellChange(c.id, 'remarks', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 6)}
                          placeholder="Remarks..."
                          className="w-full py-1 px-2 rounded-lg bg-surface-inset border border-border-default text-xs text-primary focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                        />
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-1.5 px-2 text-center sticky right-0 z-10 bg-surface-raised shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] border-l border-border-default/40">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-inset hover:bg-teal-500/10 border border-border-default hover:border-teal-500/30 text-teal-800 dark:text-teal-300 font-bold text-[10px] transition-all cursor-pointer shadow-xs active:scale-95"
                            title={`Edit customer ${c.customerName}`}
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(c)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-inset hover:bg-rose-500/10 border border-border-default hover:border-rose-500/30 text-rose-700 dark:text-rose-400 font-bold text-[10px] transition-all cursor-pointer shadow-xs active:scale-95"
                            title={`Delete or clear entry for ${c.customerName}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Del</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Sticky Totals Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-surface-sidebar border-t-2 border-border-strong shadow-raised font-black text-xs text-primary">
              <tr>
                <td className="py-3 px-3 text-center border-r border-border-default">
                  Σ
                </td>
                <td className="py-3 px-3 sticky left-0 z-20 bg-surface-sidebar border-r border-border-default">
                  TOTALS ({filteredTotals.activeAccounts} Active / {filteredTotals.count})
                </td>
                <td className="py-3 px-3 text-secondary text-[11px] border-r border-border-default">
                  {selectedRoute === 'ALL' ? 'All Routes' : selectedRoute}
                </td>
                <td className="py-3 px-3 text-right tabular-nums border-r border-border-default text-amber-800 dark:text-amber-300">
                  —
                </td>
                <td className="py-3 px-2 text-center tabular-nums border-r border-border-default text-blue-800 dark:text-blue-300">
                  {bottleActive.pkg1L ? `${formatNumber(filteredTotals.total1L)} PKGs` : '—'}
                </td>
                <td className="py-3 px-2 text-center tabular-nums border-r border-border-default text-teal-800 dark:text-teal-300">
                  {bottleActive.pkg500ml ? `${formatNumber(filteredTotals.total500ml)} PKGs` : '—'}
                </td>
                <td className="py-3 px-2 text-center tabular-nums border-r border-border-default text-amber-800 dark:text-amber-300">
                  {bottleActive.pkg250ml ? `${formatNumber(filteredTotals.total250ml)} PKGs` : '—'}
                </td>
                <td className="py-3 px-3 text-right tabular-nums border-r border-border-default text-teal-900 dark:text-teal-200 bg-teal-500/10">
                  {formatMoney(filteredTotals.billPaise)}
                </td>
                <td className="py-3 px-2 text-right tabular-nums border-r border-border-default text-emerald-800 dark:text-emerald-300 bg-emerald-500/5">
                  {formatMoney(filteredTotals.cashPaise)}
                </td>
                <td className="py-3 px-2 text-right tabular-nums border-r border-border-default text-sky-800 dark:text-sky-300 bg-sky-500/5">
                  {formatMoney(filteredTotals.upiPaise)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums border-r border-border-default text-emerald-900 dark:text-emerald-200 bg-emerald-500/10">
                  {formatMoney(filteredTotals.receivedPaise)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums border-r border-border-default text-amber-900 dark:text-amber-200">
                  {formatMoney(filteredTotals.remainingDuePaise)}
                </td>
                <td className="py-3 px-3 text-secondary text-[11px] border-r border-border-default">
                  {modifiedCount > 0 ? `${modifiedCount} unsaved rows` : 'All saved'}
                </td>
                <td className="py-3 px-3 text-center sticky right-0 z-20 bg-surface-sidebar shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] border-l border-border-default text-muted">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 6. Runtime Add Customer Modal */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised border border-border-default shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-800 dark:text-teal-300">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-primary">Add New Customer</h3>
                  <p className="text-xs text-secondary">
                    Create a customer directly into the register sheet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddCustomerModalOpen(false)}
                className="text-secondary hover:text-primary p-1.5 rounded-lg hover:bg-surface-inset transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              {/* Row 1: Customer Name & Customer ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-primary mb-1">
                    Customer / Owner Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Ramesh Patel"
                    value={newCustomerForm.customerName}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-secondary mb-1">
                    Customer ID / Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto or CUST-01"
                    value={newCustomerForm.code}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Category & Firm Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">
                    Category <span className="text-danger">*</span>
                  </label>
                  <div className="flex rounded-xl bg-surface-inset p-1 border border-border-default">
                    {(['A', 'B', 'C'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCustomerForm({ ...newCustomerForm, category: cat })}
                        className={`flex-1 py-1 text-center font-bold rounded-lg text-xs transition-all ${
                          newCustomerForm.category === cat
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-secondary hover:text-primary hover:bg-surface-raised'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-secondary mb-1">
                    Shop / Firm Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Patel Cold Drinks"
                    value={newCustomerForm.firmName}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, firmName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Route & Area (Direct Dropdown Menus) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1">
                    Route <span className="text-danger">*</span>
                  </label>
                  <select
                    required={!isCustomRoute}
                    value={isCustomRoute ? '__CUSTOM__' : newCustomerForm.routeName}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomRoute(true);
                        setNewCustomerForm({ ...newCustomerForm, routeName: '' });
                      } else {
                        setIsCustomRoute(false);
                        const r = e.target.value;
                        const areasInRoute = routeAreaMap[r] || [];
                        setNewCustomerForm({
                          ...newCustomerForm,
                          routeName: r,
                          areaName: areasInRoute.length === 1 ? areasInRoute[0] : newCustomerForm.areaName,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none cursor-pointer text-xs"
                  >
                    <option value="">-- Select Route --</option>
                    {routeOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Add New Route...</option>
                  </select>
                  {isCustomRoute && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom Route name..."
                      value={newCustomerForm.routeName}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, routeName: e.target.value })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-surface-inset border border-teal-500 text-primary text-xs font-semibold outline-none"
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1">
                    Area / Locality <span className="text-danger">*</span>
                  </label>
                  <select
                    required={!isCustomArea}
                    value={isCustomArea ? '__CUSTOM__' : newCustomerForm.areaName}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomArea(true);
                        setNewCustomerForm({ ...newCustomerForm, areaName: '' });
                      } else {
                        setIsCustomArea(false);
                        setNewCustomerForm({ ...newCustomerForm, areaName: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none cursor-pointer text-xs"
                  >
                    <option value="">-- Select Area --</option>
                    {((newCustomerForm.routeName && routeAreaMap[newCustomerForm.routeName]?.length)
                      ? routeAreaMap[newCustomerForm.routeName]
                      : allAreaOptions
                    ).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Add New Area...</option>
                  </select>
                  {isCustomArea && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom Area name..."
                      value={newCustomerForm.areaName}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, areaName: e.target.value })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-surface-inset border border-teal-500 text-primary text-xs font-semibold outline-none"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Row 4: Address (Optional) */}
              <div>
                <label className="block font-bold text-secondary mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shop #4, Near Railway Station (Optional)"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Row 5: Phone & Opening Due */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-secondary mb-1">
                    Phone / Mobile (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={newCustomerForm.contact}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-secondary mb-1">
                    Opening Due (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={newCustomerForm.openingDueRupees}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, openingDueRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-primary font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddCustomerModalOpen(false)}
                  disabled={isCreatingCustomer}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isCreatingCustomer}
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="font-bold shadow-raised"
                >
                  Create & Record Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Edit Customer Modal */}
      {editCustomerModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised border border-border-default shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-800 dark:text-teal-300">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary">Edit Customer Details</h3>
                  <p className="text-xs text-secondary">Update customer master profile and custom bottle rates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditCustomerModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-inset text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-secondary">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editCustomerForm.customerName}
                    onChange={(e) => setEditCustomerForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-xs font-bold text-primary outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary">Firm / Shop Name</label>
                  <input
                    type="text"
                    value={editCustomerForm.firmName}
                    onChange={(e) => setEditCustomerForm(prev => ({ ...prev, firmName: e.target.value }))}
                    placeholder="e.g. Fresh Point Corner"
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-xs text-primary outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary">Customer Code / ID</label>
                  <input
                    type="text"
                    value={editCustomerForm.code}
                    onChange={(e) => setEditCustomerForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g. CUST-0021"
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-xs font-mono font-bold text-primary outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary">Contact Mobile</label>
                  <input
                    type="tel"
                    value={editCustomerForm.contact}
                    onChange={(e) => setEditCustomerForm(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="e.g. 98250 12345"
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-xs text-primary outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary">Route Name</label>
                  <input
                    type="text"
                    value={editCustomerForm.routeName}
                    onChange={(e) => setEditCustomerForm(prev => ({ ...prev, routeName: e.target.value }))}
                    list="edit-routes-list"
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-xs font-semibold text-primary outline-none focus:border-teal-500"
                  />
                  <datalist id="edit-routes-list">
                    {routeOptions.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-secondary">Area / Sector Name</label>
                  <input
                    type="text"
                    value={editCustomerForm.areaName}
                    onChange={(e) => setEditCustomerForm(prev => ({ ...prev, areaName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-xs font-semibold text-primary outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-secondary">Address (Optional)</label>
                  <input
                    type="text"
                    value={editCustomerForm.address}
                    onChange={(e) => setEditCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Shop address..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-default text-xs text-primary outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Custom Rates Section */}
              <div className="p-3 rounded-xl bg-surface-inset border border-border-default space-y-2">
                <span className="text-xs font-bold text-primary block">Custom Product Rates (₹ per PKG)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block mb-1">1 Litre (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editCustomerForm.rate1LRupees}
                      onChange={(e) => setEditCustomerForm(prev => ({ ...prev, rate1LRupees: e.target.value }))}
                      className="w-full text-center px-2 py-1.5 rounded-lg bg-surface-raised border border-border-default text-xs font-bold text-primary outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-teal-700 dark:text-teal-300 block mb-1">500 ml (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editCustomerForm.rate500mlRupees}
                      onChange={(e) => setEditCustomerForm(prev => ({ ...prev, rate500mlRupees: e.target.value }))}
                      className="w-full text-center px-2 py-1.5 rounded-lg bg-surface-raised border border-border-default text-xs font-bold text-primary outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block mb-1">250 ml (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editCustomerForm.rate250mlRupees}
                      onChange={(e) => setEditCustomerForm(prev => ({ ...prev, rate250mlRupees: e.target.value }))}
                      className="w-full text-center px-2 py-1.5 rounded-lg bg-surface-raised border border-border-default text-xs font-bold text-primary outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href={`/dashboard/admin/customers/${editingCustomer.id}`}
                  target="_blank"
                  className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Full Ledger</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditCustomerModalOpen(false)}
                    disabled={isUpdatingCustomer}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isUpdatingCustomer}
                    className="font-bold shadow-raised"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Delete / Clear Entry Modal */}
      {deleteModalOpen && deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-raised border border-border-default shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary">Customer Actions</h3>
                  <p className="text-xs text-secondary truncate max-w-[260px]">{deletingCustomer.customerName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-inset text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Choose an action for <strong className="text-primary">{deletingCustomer.customerName}</strong>:
            </p>

            <div className="space-y-2.5">
              {/* Option A: Clear Today's Entry */}
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleClearRowEntry}
                className="w-full text-left p-3.5 rounded-xl bg-surface-inset hover:bg-amber-500/10 border border-border-default hover:border-amber-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 group-hover:scale-105 transition-transform">
                    <Eraser className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-primary block">
                      Clear / Reset Today&apos;s Entry
                    </span>
                    <span className="text-[10px] text-secondary block mt-0.5">
                      Clears entered PKGs, Cash, and UPI for today. If already saved in the database, removes today&apos;s records and restores previous due.
                    </span>
                  </div>
                </div>
              </button>

              {/* Option B: Delete Customer Record */}
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCustomer}
                className="w-full text-left p-3.5 rounded-xl bg-surface-inset hover:bg-rose-500/10 border border-border-default hover:border-rose-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 group-hover:scale-105 transition-transform">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                      Delete / Deactivate Customer
                    </span>
                    <span className="text-[10px] text-secondary block mt-0.5">
                      Removes this customer from the active register sheet. If accounting records exist, they are preserved safely as inactive.
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-default">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
