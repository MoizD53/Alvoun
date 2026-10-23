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
  Box,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  PackageCheck,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  createProductionBatch, 
  deleteProductionBatch, 
  recordRawMaterialMovement 
} from '@/lib/actions/admin/production';

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

interface RawMaterialItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minReorderLevel: number;
  targetProduct?: string | null;
}

interface RawMovementItem {
  id: string;
  materialId: string;
  material: { name: string; unit: string; category: string };
  type: string;
  quantity: number;
  openingStock: number;
  closingStock: number;
  referenceNo?: string | null;
  notes?: string | null;
  movementDate: Date | string;
}

interface ProductInventoryItem {
  productId: string;
  productName: string;
  bottlesPerCrate: number;
  producedCrates: number;
  soldCrates: number;
  stockCrates: number;
  stockBottles: number;
  stockLitres: number;
}

interface ProductionClientProps {
  initialData: {
    batches: BatchItem[];
    products: ProductItem[];
    rawMaterials?: RawMaterialItem[];
    rawMovements?: RawMovementItem[];
    productInventory?: ProductInventoryItem[];
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
  const [activeTab, setActiveTab] = useState<'batches' | 'raw_materials' | 'product_inventory'>('batches');
  
  // Modals
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    productId: initialData.products[0]?.id || '',
    cratesProduced: '',
    looseBottles: '0',
    productionDate: new Date().toISOString().split('T')[0],
    shift: 'DAY' as 'DAY' | 'NIGHT',
    supervisor: '',
    notes: '',
  });

  // Movement Form State
  const [movementForm, setMovementForm] = useState({
    materialId: initialData.rawMaterials?.[0]?.id || '',
    type: 'INWARD' as 'INWARD' | 'CONSUMED' | 'ADJUSTMENT',
    quantity: '',
    referenceNo: '',
    notes: '',
  });

  const selectedProduct = initialData.products.find((p) => p.id === batchForm.productId);
  
  const getProductLitresPerBottle = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes('2 litre') || norm.includes('2l')) return 2.0;
    if (norm.includes('1 litre') || norm.includes('1l')) return 1.0;
    if (norm.includes('500')) return 0.5;
    if (norm.includes('250')) return 0.25;
    return 1.0;
  };

  const previewBottles = selectedProduct
    ? (parseInt(batchForm.cratesProduced) || 0) * selectedProduct.bottlesPerCrate + (parseInt(batchForm.looseBottles) || 0)
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

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const pkgs = parseInt(batchForm.cratesProduced);
    if (!batchForm.productId) {
      setErrorMsg('Please select a product');
      return;
    }
    if (isNaN(pkgs) || pkgs <= 0) {
      setErrorMsg('PKGs produced must be a positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createProductionBatch({
        productId: batchForm.productId,
        cratesProduced: pkgs,
        looseBottles: parseInt(batchForm.looseBottles) || 0,
        productionDate: batchForm.productionDate,
        shift: batchForm.shift,
        supervisor: batchForm.supervisor.trim() || undefined,
        notes: batchForm.notes.trim() || undefined,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Batch ${res.batchNumber} recorded successfully (${res.volumeLitres} Litres)`);
        setBatchForm({
          productId: initialData.products[0]?.id || '',
          cratesProduced: '',
          looseBottles: '0',
          productionDate: new Date().toISOString().split('T')[0],
          shift: 'DAY',
          supervisor: '',
          notes: '',
        });
        setTimeout(() => {
          setBatchModalOpen(false);
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

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const qty = parseFloat(movementForm.quantity);
    if (!movementForm.materialId) {
      setErrorMsg('Please select a raw material');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Quantity must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordRawMaterialMovement({
        materialId: movementForm.materialId,
        type: movementForm.type,
        quantity: qty,
        referenceNo: movementForm.referenceNo,
        notes: movementForm.notes,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Raw material movement recorded successfully');
        setMovementForm({
          materialId: initialData.rawMaterials?.[0]?.id || '',
          type: 'INWARD',
          quantity: '',
          referenceNo: '',
          notes: '',
        });
        setTimeout(() => {
          setMovementModalOpen(false);
          setSuccessMsg('');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg('Failed to record movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async (id: string, batchNumber: string) => {
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

  const handleExportXLSX = async () => {
    const xlsx = await import('xlsx');
    const sheetData = initialData.batches.map((b) => ({
      'Batch Number': b.batchNumber,
      'Date': new Date(b.productionDate).toLocaleDateString('en-IN'),
      'Product': b.product.name,
      'Shift': b.shift,
      'PKGs Produced': b.cratesProduced,
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-raised p-6 rounded-2xl border border-border/40 shadow-raised">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Production & Bottling Logs</h1>
              <p className="text-sm text-muted-foreground">
                Track daily batch volume, PKGs, bottle yields & inventory across 1L, 500ml, 250ml & 2L lines
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeTab === 'batches' && (
            <>
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
                  setBatchModalOpen(true);
                }}
                className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-raised gap-2"
              >
                <Plus className="h-4 w-4" />
                Log Batch
              </Button>
            </>
          )}

          {activeTab === 'raw_materials' && (
            <Button
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setMovementModalOpen(true);
              }}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-raised gap-2"
            >
              <Plus className="h-4 w-4" />
              Record Material Movement
            </Button>
          )}
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="inline-flex p-1.5 bg-surface-inset shadow-inset rounded-2xl border border-border/40 gap-1.5">
        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'batches'
              ? 'bg-primary text-primary-foreground shadow-raised-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>Production Batches</span>
        </button>

        <button
          onClick={() => setActiveTab('raw_materials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'raw_materials'
              ? 'bg-primary text-primary-foreground shadow-raised-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Raw Material Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('product_inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'product_inventory'
              ? 'bg-primary text-primary-foreground shadow-raised-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Finished Goods Stock</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTION BATCHES & OVERVIEW */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          {/* KPI Overview Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-surface-raised border-border/40 shadow-raised">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Volume Packaged</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Droplet className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-primary tabular-nums">
                  {initialData.totalLitres.toLocaleString('en-IN')} <span className="text-sm font-semibold">Litres</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Across all bottle lines</p>
              </div>
            </Card>

            <Card className="p-5 bg-surface-raised border-border/40 shadow-raised">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total PKGs Produced</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Box className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {initialData.totalCrates.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Ready for warehouse dispatch</p>
              </div>
            </Card>

            <Card className="p-5 bg-surface-raised border-border/40 shadow-raised">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Bottles Packaged</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {initialData.totalBottles.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Bottles capped & labeled</p>
              </div>
            </Card>

            <Card className="p-5 bg-surface-raised border-border/40 shadow-raised">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Batches Logged</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {initialData.count} <span className="text-sm font-normal text-muted-foreground">records</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Day and Night shift runs</p>
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
                  className="p-4 rounded-xl border border-border/40 bg-surface-raised shadow-raised-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{prod.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {prod.bottlesPerCrate} btl/PKG
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-lg font-bold text-primary tabular-nums">
                      {stats.litres.toLocaleString('en-IN')} L
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {stats.crates} PKGs ({stats.batches} batches)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-raised p-3.5 rounded-xl border border-border/40 shadow-raised-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <Button
                size="sm"
                variant={currentProduct === 'ALL' ? 'primary' : 'outline'}
                onClick={() => handleFilterProduct('ALL')}
                className="text-xs h-8 px-3 rounded-lg"
              >
                All Products
              </Button>
              {initialData.products.map((prod) => (
                <Button
                  key={prod.id}
                  size="sm"
                  variant={currentProduct === prod.id ? 'primary' : 'outline'}
                  onClick={() => handleFilterProduct(prod.id)}
                  className="text-xs h-8 px-3 rounded-lg whitespace-nowrap"
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
                className="text-xs h-8 px-2.5 rounded-lg border border-border/40 bg-surface-inset text-foreground"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                className="text-xs h-8 px-2.5 rounded-lg border border-border/40 bg-surface-inset text-foreground"
              />
              <Button
                type="submit"
                size="sm"
                className="text-xs h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </Button>
            </form>
          </div>

          {/* Batches Table */}
          <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3.5">Batch Number</th>
                    <th className="px-4 py-3.5">Date & Shift</th>
                    <th className="px-4 py-3.5">Product</th>
                    <th className="px-4 py-3.5 text-center">PKGs Produced</th>
                    <th className="px-4 py-3.5 text-center">Loose Bottles</th>
                    <th className="px-4 py-3.5 text-center">Total Bottles</th>
                    <th className="px-4 py-3.5 text-right">Volume (Litres)</th>
                    <th className="px-4 py-3.5">Supervisor</th>
                    <th className="px-4 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-surface-raised">
                  {initialData.batches.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        No production batches logged for the selected period.
                      </td>
                    </tr>
                  ) : (
                    initialData.batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-surface-inset/30 transition-colors">
                        <td className="px-4 py-3.5 font-bold font-mono text-primary">
                          {batch.batchNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground">
                            {new Date(batch.productionDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            {batch.shift === 'DAY' ? (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Sun className="w-3 h-3" /> Day Shift
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                <Moon className="w-3 h-3" /> Night Shift
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-foreground">
                          {batch.product.name}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-foreground tabular-nums">
                          {batch.cratesProduced.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-center text-muted-foreground tabular-nums">
                          {batch.looseBottles || 0}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-foreground tabular-nums">
                          {batch.totalBottles.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-primary tabular-nums">
                          {batch.volumeLitres.toLocaleString('en-IN')} L
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">
                          {batch.supervisor || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete Batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* TAB 2: RAW MATERIAL INVENTORY */}
      {activeTab === 'raw_materials' && (
        <div className="space-y-6">
          {/* Raw Materials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(initialData.rawMaterials || []).map((mat) => {
              const isLow = mat.currentStock <= mat.minReorderLevel;
              return (
                <div 
                  key={mat.id}
                  className="bg-surface-raised shadow-raised p-5 rounded-2xl border border-border/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="teal" size="sm">
                        {mat.category}
                      </Badge>
                      {isLow && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground">{mat.name}</h3>
                    {mat.targetProduct && (
                      <p className="text-xs text-muted-foreground mt-0.5">Line: {mat.targetProduct}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/40 flex items-end justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current Stock</span>
                      <div className="text-2xl font-bold text-primary tabular-nums mt-0.5">
                        {mat.currentStock.toLocaleString('en-IN')} <span className="text-xs font-semibold text-muted-foreground">{mat.unit}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMaterialId(mat.id);
                        setMovementForm({ ...movementForm, materialId: mat.id });
                        setErrorMsg('');
                        setSuccessMsg('');
                        setMovementModalOpen(true);
                      }}
                      className="text-xs px-3 py-1.5 h-8 gap-1.5 border-border/50 bg-surface-inset"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-primary" />
                      Adjust
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Movement Log */}
          <div className="bg-surface-raised shadow-raised rounded-2xl border border-border/40 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Recent Raw Material Movements</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Audit trail of inward, consumed, and manual stock updates</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
                <thead className="bg-surface-inset shadow-inset text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Material</th>
                    <th className="px-4 py-3.5">Movement Type</th>
                    <th className="px-4 py-3.5 text-center">Quantity</th>
                    <th className="px-4 py-3.5 text-center">Stock Before</th>
                    <th className="px-4 py-3.5 text-center">Stock After</th>
                    <th className="px-4 py-3.5">Reference / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-surface-raised">
                  {(initialData.rawMovements || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No movement records logged yet.
                      </td>
                    </tr>
                  ) : (
                    (initialData.rawMovements || []).map((mov) => (
                      <tr key={mov.id} className="hover:bg-surface-inset/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {new Date(mov.movementDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {mov.material?.name || 'Raw Material'}
                        </td>
                        <td className="px-4 py-3">
                          {mov.type === 'INWARD' && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5" /> INWARD
                            </span>
                          )}
                          {mov.type === 'CONSUMED' && (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5" /> CONSUMED
                            </span>
                          )}
                          {mov.type === 'ADJUSTMENT' && (
                            <span className="inline-flex items-center gap-1 text-primary font-bold">
                              <RefreshCw className="w-3.5 h-3.5" /> ADJUSTMENT
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-foreground tabular-nums">
                          {mov.quantity} {mov.material?.unit}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                          {mov.openingStock}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-primary tabular-nums">
                          {mov.closingStock}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {mov.referenceNo ? `Ref #${mov.referenceNo} ` : ''}
                          {mov.notes ? `(${mov.notes})` : ''}
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

      {/* TAB 3: FINISHED GOODS INVENTORY */}
      {activeTab === 'product_inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(initialData.productInventory || []).map((prod) => (
              <div 
                key={prod.productId}
                className="bg-surface-raised shadow-raised p-5 rounded-2xl border border-border/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {prod.bottlesPerCrate} btl/PKG
                    </span>
                    <Badge variant="teal" size="sm">Line Active</Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{prod.productName}</h3>
                </div>

                <div className="space-y-3 mt-4 pt-4 border-t border-border/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Produced to Date:</span>
                    <span className="font-bold text-foreground tabular-nums">{prod.producedCrates.toLocaleString('en-IN')} PKGs</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Dispatched / Sold:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{prod.soldCrates.toLocaleString('en-IN')} PKGs</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-border/30">
                    <span className="font-semibold text-foreground">Available Stock:</span>
                    <span className="text-lg font-extrabold text-primary tabular-nums">{prod.stockCrates.toLocaleString('en-IN')} PKGs</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground text-right tabular-nums">
                    ≈ {prod.stockBottles.toLocaleString('en-IN')} bottles ({prod.stockLitres.toLocaleString('en-IN')} L)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: LOG PRODUCTION BATCH */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-raised shadow-raised-lg border border-border/40 rounded-3xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Factory className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Log Production Batch</h2>
                  <p className="text-xs text-muted-foreground">Record finished packaged goods by shift</p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-inset transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Product Line</label>
                  <select
                    value={batchForm.productId}
                    onChange={(e) => setBatchForm({ ...batchForm, productId: e.target.value })}
                    className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                  >
                    {initialData.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.bottlesPerCrate} btl/PKG)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Shift</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBatchForm({ ...batchForm, shift: 'DAY' })}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        batchForm.shift === 'DAY'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-surface-inset border-border/40 text-muted-foreground'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" /> Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchForm({ ...batchForm, shift: 'NIGHT' })}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        batchForm.shift === 'NIGHT'
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                          : 'bg-surface-inset border-border/40 text-muted-foreground'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" /> Night
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">PKGs Produced</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={batchForm.cratesProduced}
                    onChange={(e) => setBatchForm({ ...batchForm, cratesProduced: e.target.value })}
                    className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Loose Bottles (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={batchForm.looseBottles}
                    onChange={(e) => setBatchForm({ ...batchForm, looseBottles: e.target.value })}
                    className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Calculated Preview Capsule */}
              <div className="p-3 rounded-xl bg-surface-inset border border-border/40 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Total Yield: </span>
                  <strong className="text-foreground">{previewBottles.toLocaleString('en-IN')} bottles</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Volume: </span>
                  <strong className="text-primary">{previewLitres.toLocaleString('en-IN')} Litres</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Production Date</label>
                  <input
                    type="date"
                    value={batchForm.productionDate}
                    onChange={(e) => setBatchForm({ ...batchForm, productionDate: e.target.value })}
                    className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Supervisor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Arif"
                    value={batchForm.supervisor}
                    onChange={(e) => setBatchForm({ ...batchForm, supervisor: e.target.value })}
                    className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Notes / Comments</label>
                <input
                  type="text"
                  placeholder="e.g. Line cleaned before run"
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isSubmitting ? 'Recording...' : 'Record Production'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD RAW MATERIAL MOVEMENT */}
      {movementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-raised shadow-raised-lg border border-border/40 rounded-3xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Archive className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Record Raw Material Movement</h2>
                  <p className="text-xs text-muted-foreground">Inward receipt, batch consumption, or stock adjustment</p>
                </div>
              </div>
              <button
                onClick={() => setMovementModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-inset transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {successMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Raw Material</label>
                <select
                  value={movementForm.materialId}
                  onChange={(e) => setMovementForm({ ...movementForm, materialId: e.target.value })}
                  className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                >
                  {(initialData.rawMaterials || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Stock: {m.currentStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Movement Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'INWARD' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      movementForm.type === 'INWARD'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-surface-inset border-border/40 text-muted-foreground'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" /> Inward
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'CONSUMED' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      movementForm.type === 'CONSUMED'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                        : 'bg-surface-inset border-border/40 text-muted-foreground'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Consumed
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'ADJUSTMENT' })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      movementForm.type === 'ADJUSTMENT'
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface-inset border-border/40 text-muted-foreground'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Adjustment
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {movementForm.type === 'ADJUSTMENT' ? 'New Exact Stock Level' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 100"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                    className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Reference / Invoice No</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-90"
                    value={movementForm.referenceNo}
                    onChange={(e) => setMovementForm({ ...movementForm, referenceNo: e.target.value })}
                    className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Supplier delivery from Vadodara"
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  className="w-full text-xs font-semibold bg-surface-inset border border-border/40 rounded-xl px-3 py-2.5 text-foreground focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMovementModalOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isSubmitting ? 'Saving...' : 'Record Movement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
