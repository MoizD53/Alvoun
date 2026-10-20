'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Factory, 
  Plus, 
  Layers, 
  Droplet, 
  Sun, 
  Moon, 
  Trash2, 
  Download, 
  Filter, 
  CheckCircle, 
  X,
  Calendar,
  Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createProductionBatch, deleteProductionBatch } from '@/lib/actions/admin/production';
import * as xlsx from 'xlsx';

interface ProductItem {
  id: string;
  name: string;
  bottlesPerCrate: number;
}

interface BatchItem {
  id: string;
  batchNumber: string;
  productId: string;
  product: ProductItem;
  cratesProduced: number;
  looseBottles: number;
  totalBottles: number;
  volumeLitres: number;
  productionDate: Date | string;
  shift: string;
  supervisor?: string | null;
  notes?: string | null;
}

interface ProductionClientProps {
  initialData: {
    batches: BatchItem[];
    products: ProductItem[];
    totalCrates: number;
    totalBottles: number;
    totalLitres: number;
    productTotals: Record<string, { crates: number; litres: number; batches: number }>;
    count: number;
  };
  currentProduct: string;
  startDate: string;
  endDate: string;
}

export default function ProductionClient({
  initialData,
  currentProduct,
  startDate,
  endDate,
}: ProductionClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    productId: initialData.products[0]?.id || '',
    cratesProduced: '',
    looseBottles: '0',
    productionDate: new Date().toISOString().split('T')[0],
    shift: 'DAY' as 'DAY' | 'NIGHT',
    supervisor: '',
    notes: '',
  });

  const selectedProduct = initialData.products.find((p) => p.id === formData.productId);
  
  // Volume helper
  const getProductLitresPerBottle = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes('2 litre') || norm.includes('2l')) return 2.0;
    if (norm.includes('1 litre') || norm.includes('1l')) return 1.0;
    if (norm.includes('500')) return 0.5;
    if (norm.includes('250')) return 0.25;
    return 1.0;
  };

  const previewBottles = selectedProduct
    ? (parseInt(formData.cratesProduced) || 0) * selectedProduct.bottlesPerCrate + (parseInt(formData.looseBottles) || 0)
    : 0;

  const previewLitres = selectedProduct
    ? previewBottles * getProductLitresPerBottle(selectedProduct.name)
    : 0;

  const handleFilterProduct = (prodId: string) => {
    const params = new URLSearchParams(window.location.search);
    if (prodId === 'ALL') {
      params.delete('productId');
    } else {
      params.set('productId', prodId);
    }
    router.push(`/dashboard/admin/production?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const crates = parseInt(formData.cratesProduced);
    if (!formData.productId) {
      setErrorMsg('Please select a product');
      return;
    }
    if (isNaN(crates) || crates <= 0) {
      setErrorMsg('Crates produced must be a positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createProductionBatch({
        productId: formData.productId,
        cratesProduced: crates,
        looseBottles: parseInt(formData.looseBottles) || 0,
        productionDate: formData.productionDate,
        shift: formData.shift,
        supervisor: formData.supervisor.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Batch ${res.batchNumber} recorded successfully (${res.volumeLitres} Litres)`);
        setFormData({
          productId: initialData.products[0]?.id || '',
          cratesProduced: '',
          looseBottles: '0',
          productionDate: new Date().toISOString().split('T')[0],
          shift: 'DAY',
          supervisor: '',
          notes: '',
        });
        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg('');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to record production batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, batchNumber: string) => {
    if (!confirm(`Are you sure you want to delete production batch ${batchNumber}?`)) {
      return;
    }
    const res = await deleteProductionBatch(id);
    if (res.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const handleExportXLSX = () => {
    const sheetData = initialData.batches.map((b) => ({
      'Batch Number': b.batchNumber,
      'Date': new Date(b.productionDate).toLocaleDateString('en-IN'),
      'Product': b.product.name,
      'Shift': b.shift,
      'Crates Produced': b.cratesProduced,
      'Loose Bottles': b.looseBottles,
      'Total Bottles': b.totalBottles,
      'Total Volume (Litres)': b.volumeLitres,
      'Supervisor': b.supervisor || 'N/A',
      'Notes': b.notes || '',
    }));

    const ws = xlsx.utils.json_to_sheet(sheetData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Production Log');
    xlsx.writeFile(wb, `Alvoun-Production-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#EDE4D8]/60 p-6 rounded-2xl border border-[#DDD3C3] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_8px_rgba(26,95,99,0.06)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#1A5F63]/10 border border-[#1A5F63]/20 flex items-center justify-center text-[#1A5F63]">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1A2E35]">Production & Bottling Logs</h1>
              <p className="text-sm text-[#5A6B72]">
                Track daily batch volume, crates, and bottle yields across 1L, 500ml, 250ml & 2L lines
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExportXLSX}
            className="flex-1 sm:flex-none border-[#DDD3C3] bg-[#F5EFE6] hover:bg-[#EDE4D8] text-[#1A2E35] font-medium shadow-sm gap-2"
          >
            <Download className="h-4 w-4 text-[#1A5F63]" />
            Export Excel
          </Button>
          <Button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-[#1A5F63] hover:bg-[#13484B] text-white font-medium shadow-sm gap-2"
          >
            <Plus className="h-4 w-4" />
            Log Batch
          </Button>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B72]">Total Volume Packaged</span>
            <div className="p-2 rounded-lg bg-[#1A5F63]/10 text-[#1A5F63]">
              <Droplet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1A5F63]">
              {initialData.totalLitres.toLocaleString('en-IN')} <span className="text-sm font-semibold">Litres</span>
            </div>
            <p className="text-xs text-[#5A6B72] mt-1">Across all bottle lines</p>
          </div>
        </Card>

        <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B72]">Total Crates Produced</span>
            <div className="p-2 rounded-lg bg-[#1A5F63]/10 text-[#1A5F63]">
              <Box className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1A2E35]">
              {initialData.totalCrates.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#5A6B72] mt-1">Ready for warehouse dispatch</p>
          </div>
        </Card>

        <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B72]">Total Bottles Packaged</span>
            <div className="p-2 rounded-lg bg-[#1A5F63]/10 text-[#1A5F63]">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1A2E35]">
              {initialData.totalBottles.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#5A6B72] mt-1">Bottles capped & labeled</p>
          </div>
        </Card>

        <Card className="p-5 bg-[#F5EFE6] border-[#DDD3C3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B72]">Total Batches Logged</span>
            <div className="p-2 rounded-lg bg-[#1A5F63]/10 text-[#1A5F63]">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#1A2E35]">
              {initialData.count} <span className="text-sm font-normal text-[#5A6B72]">records</span>
            </div>
            <p className="text-xs text-[#5A6B72] mt-1">Day and Night shift runs</p>
          </div>
        </Card>
      </div>

      {/* Product Volume Breakdown Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {initialData.products.map((prod) => {
          const stats = initialData.productTotals[prod.name] || { crates: 0, litres: 0, batches: 0 };
          return (
            <div
              key={prod.id}
              className="p-4 rounded-xl border border-[#DDD3C3] bg-[#EDE4D8]/50 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#1A2E35]">{prod.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1A5F63]/10 text-[#1A5F63] font-medium">
                  {prod.bottlesPerCrate} btl/crate
                </span>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-[#1A5F63]">
                  {stats.litres.toLocaleString('en-IN')} L
                </div>
                <div className="text-xs text-[#5A6B72] mt-0.5">
                  {stats.crates} crates ({stats.batches} batches)
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs & Date Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#EDE4D8]/40 p-3 rounded-xl border border-[#DDD3C3]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Button
            size="sm"
            variant={currentProduct === 'ALL' ? 'primary' : 'outline'}
            onClick={() => handleFilterProduct('ALL')}
            className={`text-xs h-8 px-3 rounded-lg ${
              currentProduct === 'ALL'
                ? 'bg-[#1A5F63] text-white hover:bg-[#13484B]'
                : 'bg-[#F5EFE6] border-[#DDD3C3] text-[#1A2E35] hover:bg-[#EDE4D8]'
            }`}
          >
            All Products
          </Button>
          {initialData.products.map((prod) => (
            <Button
              key={prod.id}
              size="sm"
              variant={currentProduct === prod.id ? 'primary' : 'outline'}
              onClick={() => handleFilterProduct(prod.id)}
              className={`text-xs h-8 px-3 rounded-lg whitespace-nowrap ${
                currentProduct === prod.id
                  ? 'bg-[#1A5F63] text-white hover:bg-[#13484B]'
                  : 'bg-[#F5EFE6] border-[#DDD3C3] text-[#1A2E35] hover:bg-[#EDE4D8]'
              }`}
            >
              {prod.name}
            </Button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const start = (form.elements.namedItem('startDate') as HTMLInputElement).value;
            const end = (form.elements.namedItem('endDate') as HTMLInputElement).value;
            const params = new URLSearchParams(window.location.search);
            if (start) params.set('startDate', start);
            else params.delete('startDate');
            if (end) params.set('endDate', end);
            else params.delete('endDate');
            router.push(`/dashboard/admin/production?${params.toString()}`);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="date"
            name="startDate"
            defaultValue={startDate}
            className="text-xs h-8 px-2.5 rounded-lg border border-[#DDD3C3] bg-[#F5EFE6] text-[#1A2E35]"
          />
          <span className="text-xs text-[#5A6B72]">to</span>
          <input
            type="date"
            name="endDate"
            defaultValue={endDate}
            className="text-xs h-8 px-2.5 rounded-lg border border-[#DDD3C3] bg-[#F5EFE6] text-[#1A2E35]"
          />
          <Button
            type="submit"
            size="sm"
            className="text-xs h-8 px-3 bg-[#1A5F63] hover:bg-[#13484B] text-white"
          >
            <Filter className="h-3 w-3 mr-1" />
            Filter
          </Button>
        </form>
      </div>

      {/* Batches Table */}
      <Card className="border-[#DDD3C3] bg-[#F5EFE6] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#1A2E35]">
            <thead className="bg-[#EDE4D8] text-xs uppercase font-semibold text-[#5A6B72] border-b border-[#DDD3C3]">
              <tr>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4 text-right">Crates</th>
                <th className="py-3 px-4 text-right">Bottles</th>
                <th className="py-3 px-4 text-right">Volume</th>
                <th className="py-3 px-4">Supervisor</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD3C3]/60">
              {initialData.batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#5A6B72]">
                    <Factory className="h-10 w-10 mx-auto text-[#5A6B72]/40 mb-2" />
                    No production batches found for this filter.
                  </td>
                </tr>
              ) : (
                initialData.batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-[#EDE4D8]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-xs text-[#1A5F63]">
                      {batch.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {new Date(batch.productionDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {batch.product.name}
                    </td>
                    <td className="py-3.5 px-4">
                      {batch.shift === 'DAY' ? (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-medium text-[11px] gap-1">
                          <Sun className="h-3 w-3" /> Day
                        </Badge>
                      ) : (
                        <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-medium text-[11px] gap-1">
                          <Moon className="h-3 w-3" /> Night
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold">
                      {batch.cratesProduced.toLocaleString('en-IN')}
                      {batch.looseBottles > 0 && (
                        <span className="text-xs text-[#5A6B72] font-normal ml-1">
                          (+{batch.looseBottles} btl)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {batch.totalBottles.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#1A5F63]">
                      {batch.volumeLitres.toLocaleString('en-IN')} L
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5A6B72]">
                      {batch.supervisor || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(batch.id, batch.batchNumber)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Delete Batch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Production Batch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#F5EFE6] border border-[#DDD3C3] w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-[#DDD3C3] bg-[#EDE4D8]/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#1A5F63]/10 flex items-center justify-center text-[#1A5F63]">
                  <Factory className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A2E35]">Log Production Batch</h3>
                  <p className="text-xs text-[#5A6B72]">Record packaged crates and bottle yields</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#5A6B72] hover:text-[#1A2E35] p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

              {/* Product Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Product / Bottle Line *
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                  required
                >
                  {initialData.products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.bottlesPerCrate} bottles per crate)
                    </option>
                  ))}
                </select>
              </div>

              {/* Crates Produced & Loose Bottles */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                    Crates Produced *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={formData.cratesProduced}
                    onChange={(e) => setFormData({ ...formData, cratesProduced: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                    Loose Bottles (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.looseBottles}
                    onChange={(e) => setFormData({ ...formData, looseBottles: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                  />
                </div>
              </div>

              {/* Shift & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                    Shift *
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shift: 'DAY' })}
                      className={`flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border transition-all ${
                        formData.shift === 'DAY'
                          ? 'bg-[#1A5F63] text-white border-[#1A5F63]'
                          : 'bg-white border-[#DDD3C3] text-[#5A6B72]'
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5" /> Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shift: 'NIGHT' })}
                      className={`flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border transition-all ${
                        formData.shift === 'NIGHT'
                          ? 'bg-[#1A5F63] text-white border-[#1A5F63]'
                          : 'bg-white border-[#DDD3C3] text-[#5A6B72]'
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5" /> Night
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                    Production Date *
                  </label>
                  <input
                    type="date"
                    value={formData.productionDate}
                    onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                    required
                  />
                </div>
              </div>

              {/* Calculated Yield Preview */}
              {previewBottles > 0 && (
                <div className="p-3 bg-[#EDE4D8]/80 border border-[#DDD3C3] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#5A6B72]">Total Yield:</span>{' '}
                    <span className="font-bold text-[#1A2E35]">{previewBottles.toLocaleString()} Bottles</span>
                  </div>
                  <div>
                    <span className="text-[#5A6B72]">Liquid Volume:</span>{' '}
                    <span className="font-bold text-[#1A5F63]">{previewLitres.toLocaleString()} Litres</span>
                  </div>
                </div>
              )}

              {/* Supervisor */}
              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Supervisor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Bhai (Production Incharge)"
                  value={formData.supervisor}
                  onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDD3C3] bg-white text-sm text-[#1A2E35] focus:outline-none focus:ring-2 focus:ring-[#1A5F63]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#1A2E35] mb-1">
                  Batch Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Batch run completed with 2L line maintenance checked"
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
                  className="bg-[#1A5F63] hover:bg-[#13484B] text-white"
                >
                  {isSubmitting ? 'Recording...' : 'Record Production Batch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
