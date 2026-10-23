'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Plus,
  Minus,
  Download,
  AlertTriangle,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  X,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { recordRawMaterialInward, recordRawMaterialConsumption } from '@/lib/actions/admin/stock';
import AdminDatePicker from '../components/AdminDatePicker';

interface RawMaterialItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minReorderLevel: number;
  unitCost?: number;
  movements: {
    id: string;
    type: string;
    quantity: number;
    referenceNo?: string | null;
    movementDate: Date | string;
    notes?: string | null;
  }[];
}

interface ProductStockItem {
  id: string;
  name: string;
  bottlesPerCrate: number;
  totalProducedCrates: number;
  totalSoldCrates: number;
  currentCrates: number;
  standardRatePaise: number;
  estimatedStockValuePaise: number;
}

interface StockClientProps {
  selectedDate?: string;
  initialData: {
    rawMaterials: RawMaterialItem[];
    productStockSummary: ProductStockItem[];
    lowStockAlertsCount: number;
    lowStockAlerts: RawMaterialItem[];
  };
}

export default function StockClient({ initialData, selectedDate = '' }: StockClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'FINISHED' | 'RAW'>('FINISHED');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'INWARD' | 'CONSUMPTION'>('INWARD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    materialId: initialData.rawMaterials[0]?.id || '',
    quantity: '',
    referenceNo: '',
    movementDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const selectedMaterial = initialData.rawMaterials.find((m) => m.id === formData.materialId);

  // Total Finished Goods Valuation
  const totalFinishedGoodsValue = initialData.productStockSummary.reduce(
    (sum, p) => sum + p.estimatedStockValuePaise,
    0
  );
  const totalFinishedGoodsCrates = initialData.productStockSummary.reduce(
    (sum, p) => sum + p.currentCrates,
    0
  );

  const handleOpenModal = (type: 'INWARD' | 'CONSUMPTION', materialId?: string) => {
    setModalType(type);
    setErrorMsg('');
    setSuccessMsg('');
    setFormData({
      materialId: materialId || initialData.rawMaterials[0]?.id || '',
      quantity: '',
      referenceNo: '',
      movementDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const qty = parseFloat(formData.quantity);
    if (!formData.materialId) {
      setErrorMsg('Please select a material');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Quantity must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (modalType === 'INWARD') {
        res = await recordRawMaterialInward({
          materialId: formData.materialId,
          quantity: qty,
          referenceNo: formData.referenceNo.trim() || undefined,
          movementDate: formData.movementDate,
          notes: formData.notes.trim() || undefined,
        });
      } else {
        res = await recordRawMaterialConsumption({
          materialId: formData.materialId,
          quantity: qty,
          referenceNo: formData.referenceNo.trim() || undefined,
          movementDate: formData.movementDate,
          notes: formData.notes.trim() || undefined,
        });
      }

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(
          `${modalType === 'INWARD' ? 'Inward received' : 'Consumption logged'}: New balance is ${res.newStock} ${selectedMaterial?.unit || 'units'}`
        );
        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg('');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to process inventory movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportXLSX = async () => {
    const xlsx = await import('xlsx');
    const wb = xlsx.utils.book_new();

    // 1. Finished Goods Sheet
    const finishedData = initialData.productStockSummary.map((p) => ({
      'Product Name': p.name,
      'Pack Size (btl/PKG)': p.bottlesPerCrate,
      'Total Produced (PKGs)': p.totalProducedCrates,
      'Total Sold/Dispatched (PKGs)': p.totalSoldCrates,
      'Closing Available Stock (PKGs)': p.currentCrates,
      'Rate per PKG (INR)': (p.standardRatePaise / 100).toFixed(2),
      'Stock Valuation (INR)': (p.estimatedStockValuePaise / 100).toFixed(2),
    }));
    const wsFinished = xlsx.utils.json_to_sheet(finishedData);
    xlsx.utils.book_append_sheet(wb, wsFinished, 'Finished Goods');

    // 2. Raw Materials Sheet
    const rawData = initialData.rawMaterials.map((m) => ({
      'Material Name': m.name,
      'Category': m.category,
      'Current Stock': m.currentStock,
      'Unit': m.unit,
      'Min Reorder Level': m.minReorderLevel,
      'Status': m.currentStock <= m.minReorderLevel ? 'LOW STOCK - REORDER' : 'HEALTHY',
      'Unit Cost (INR)': m.unitCost ? (m.unitCost / 100).toFixed(2) : 'Standard',
    }));
    const wsRaw = xlsx.utils.json_to_sheet(rawData);
    xlsx.utils.book_append_sheet(wb, wsRaw, 'Raw Materials');

    xlsx.writeFile(wb, `Alvoun-Inventory-Report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#EDE4D8]/60 p-6 rounded-2xl border border-[#DDD3C3] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_8px_rgba(26,95,99,0.06)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#1A5F63]/10 border border-[#1A5F63]/20 flex items-center justify-center text-[#1A5F63]">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1A2E35]">Stock & Inventory Management</h1>
              <p className="text-sm text-[#5A6B72]">
                Opening, consumed, sold and closing balance for raw materials and packaged water PKGs
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <AdminDatePicker currentDate={selectedDate} basePath="/dashboard/admin/stock" />
          <Button
            variant="outline"
            onClick={handleExportXLSX}
            className="flex-1 sm:flex-none border-[#DDD3C3] bg-[#F5EFE6] hover:bg-[#EDE4D8] text-[#1A2E35] font-medium shadow-sm gap-2"
          >
            <Download className="h-4 w-4 text-[#1A5F63]" />
            Export Excel
          </Button>
          <Button
            onClick={() => handleOpenModal('INWARD')}
            className="flex-1 sm:flex-none bg-[#1A5F63] hover:bg-[#13484B] text-white font-medium shadow-sm gap-2"
          >
            <Plus className="h-4 w-4" />
            Inward Stock
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenModal('CONSUMPTION')}
            className="flex-1 sm:flex-none border-[#1A5F63] text-[#1A5F63] hover:bg-[#1A5F63]/10 font-medium shadow-sm gap-2"
          >
            <Minus className="h-4 w-4" />
            Log Usage
          </Button>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B72]">Available Finished Goods</span>
            <div className="p-2 rounded-lg bg-[#1A5F63]/10 text-[#1A5F63]">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1A5F63]">
              {totalFinishedGoodsCrates.toLocaleString('en-IN')}{' '}
              <span className="text-sm font-semibold">PKGs</span>
            </div>
            <p className="text-xs text-[#5A6B72] mt-1">Available across 1L, 500ml, 250ml & 2L</p>
          </div>
        </Card>

        <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B72]">Finished Stock Valuation</span>
            <div className="p-2 rounded-lg bg-[#1A5F63]/10 text-[#1A5F63]">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1A2E35]">
              ₹{(totalFinishedGoodsValue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-[#5A6B72] mt-1">At standard wholesale PKG rates</p>
          </div>
        </Card>

        <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B72]">Raw Material SKUs</span>
            <div className="p-2 rounded-lg bg-[#1A5F63]/10 text-[#1A5F63]">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1A2E35]">
              {initialData.rawMaterials.length}{' '}
              <span className="text-sm font-normal text-[#5A6B72]">Items</span>
            </div>
            <p className="text-xs text-[#5A6B72] mt-1">Preforms, caps, rolls, stickers & ink</p>
          </div>
        </Card>

        <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B72]">Reorder Alerts</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1A2E35]">
              {initialData.lowStockAlertsCount}{' '}
              <span className="text-sm font-normal text-[#5A6B72]">Items</span>
            </div>
            <p className="text-xs text-[#5A6B72] mt-1">
              {initialData.lowStockAlertsCount > 0 ? 'Items below safety threshold' : 'All raw material levels healthy'}
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#DDD3C3]">
        <button
          onClick={() => setActiveTab('FINISHED')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'FINISHED'
              ? 'border-[#1A5F63] text-[#1A5F63]'
              : 'border-transparent text-[#5A6B72] hover:text-[#1A2E35]'
          }`}
        >
          <Package className="h-4 w-4" />
          Finished Product Stock (Bottles / PKGs)
        </button>
        <button
          onClick={() => setActiveTab('RAW')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'RAW'
              ? 'border-[#1A5F63] text-[#1A5F63]'
              : 'border-transparent text-[#5A6B72] hover:text-[#1A2E35]'
          }`}
        >
          <Boxes className="h-4 w-4" />
          Raw Materials Inventory (Preforms, Caps, Stickers)
          {initialData.lowStockAlertsCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0">
              {initialData.lowStockAlertsCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Finished Goods View */}
      {activeTab === 'FINISHED' && (
        <Card className="border-[#DDD3C3] bg-[#F5EFE6] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#1A2E35]">
              <thead className="bg-[#EDE4D8] text-xs uppercase font-semibold text-[#5A6B72] border-b border-[#DDD3C3]">
                <tr>
                  <th className="py-3.5 px-4">Product Line</th>
                  <th className="py-3.5 px-4">Bottles / Crate</th>
                  <th className="py-3.5 px-4 text-right">Opening / Produced (PKGs)</th>
                  <th className="py-3.5 px-4 text-right">Sold / Dispatched (PKGs)</th>
                  <th className="py-3.5 px-4 text-right font-bold text-[#1A5F63]">Closing Available (PKGs)</th>
                  <th className="py-3.5 px-4 text-right">Standard Rate</th>
                  <th className="py-3.5 px-4 text-right">Est. Valuation</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD3C3]/60">
                {initialData.productStockSummary.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#EDE4D8]/50 transition-colors">
                    <td className="py-4 px-4 font-bold text-sm text-[#1A2E35]">
                      {prod.name}
                    </td>
                    <td className="py-4 px-4 text-xs text-[#5A6B72]">
                      {prod.bottlesPerCrate} bottles
                    </td>
                    <td className="py-4 px-4 text-right font-medium">
                      {prod.totalProducedCrates.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-amber-700">
                      {prod.totalSoldCrates.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-base text-[#1A5F63]">
                      {prod.currentCrates.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4 text-right text-xs">
                      ₹{(prod.standardRatePaise / 100).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold">
                      ₹{(prod.estimatedStockValuePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {prod.currentCrates > 20 ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                          In Stock
                        </Badge>
                      ) : prod.currentCrates > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                          Out of Stock
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Raw Materials View */}
      {activeTab === 'RAW' && (
        <Card className="border-[#DDD3C3] bg-[#F5EFE6] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#1A2E35]">
              <thead className="bg-[#EDE4D8] text-xs uppercase font-semibold text-[#5A6B72] border-b border-[#DDD3C3]">
                <tr>
                  <th className="py-3.5 px-4">Raw Material</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right font-bold text-[#1A5F63]">Current Balance</th>
                  <th className="py-3.5 px-4 text-right">Safety Minimum</th>
                  <th className="py-3.5 px-4 text-center">Stock Health</th>
                  <th className="py-3.5 px-4 text-right">Unit Cost</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD3C3]/60">
                {initialData.rawMaterials.map((mat) => {
                  const isLow = mat.currentStock <= mat.minReorderLevel;
                  return (
                    <tr key={mat.id} className="hover:bg-[#EDE4D8]/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#1A2E35]">
                        {mat.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#EDE4D8] border border-[#DDD3C3] text-[#5A6B72] font-medium">
                          {mat.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#1A5F63]">
                        {mat.currentStock.toLocaleString('en-IN')}{' '}
                        <span className="text-xs font-normal text-[#5A6B72]">{mat.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-[#5A6B72]">
                        {mat.minReorderLevel.toLocaleString('en-IN')} {mat.unit}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isLow ? (
                          <Badge className="bg-red-100 text-red-800 border-red-300 text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" /> Reorder Needed
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs gap-1">
                            <CheckCircle className="h-3 w-3" /> Healthy Stock
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs">
                        {mat.unitCost ? `₹${(mat.unitCost / 100).toFixed(2)}` : 'Standard'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenModal('INWARD', mat.id)}
                            className="h-8 px-2 text-xs text-[#1A5F63] hover:bg-[#1A5F63]/10 font-medium rounded-lg gap-1"
                            title="Receive Inward"
                          >
                            <ArrowDownLeft className="h-3.5 w-3.5" /> Inward
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenModal('CONSUMPTION', mat.id)}
                            className="h-8 px-2 text-xs text-amber-700 hover:bg-amber-100 font-medium rounded-lg gap-1"
                            title="Log Usage"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" /> Consume
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Movement Modal (Inward / Consumption) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#F5EFE6] border border-[#DDD3C3] w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-[#DDD3C3] bg-[#EDE4D8]/60">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    modalType === 'INWARD'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {modalType === 'INWARD' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-[#1A2E35]">
                    {modalType === 'INWARD' ? 'Record Raw Material Inward' : 'Log Factory Consumption'}
                  </h3>
                  <p className="text-xs text-[#5A6B72]">
                    {modalType === 'INWARD' ? 'Add purchased materials to warehouse inventory' : 'Deduct materials used during bottling run'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#5A6B72] hover:text-[#1A2E35] p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-100 border border-red-200 text-red-700 rounded-lg">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {successMsg}
                </div>
              )}

              {/* Material Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Raw Material SKU *
                </label>
                <select
                  value={formData.materialId}
                  onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                  required
                >
                  {initialData.rawMaterials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name} (Current: {mat.currentStock} {mat.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                    Quantity ({selectedMaterial?.unit || 'Units'}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="e.g. 100"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.movementDate}
                    onChange={(e) => setFormData({ ...formData, movementDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                    required
                  />
                </div>
              </div>

              {/* Reference / Invoice */}
              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Reference No / Invoice / Batch No
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-8812 or BATCH-01"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Received from packaging vendor or consumed for 1L day shift"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#DDD3C3]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="border-[#DDD3C3] text-[#1A2E35]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={
                    modalType === 'INWARD'
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-amber-700 hover:bg-amber-800 text-white'
                  }
                >
                  {isSubmitting
                    ? 'Processing...'
                    : modalType === 'INWARD'
                    ? 'Confirm Inward Stock'
                    : 'Confirm Consumption'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
