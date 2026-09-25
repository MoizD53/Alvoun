'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  CircleDot, 
  ShoppingBag, 
  Clock, 
  X, 
  Minus, 
  Plus, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  IndianRupee,
  Check,
  ChevronRight
} from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { submitVisitFlow } from '@/lib/actions/salesman/visitFlow';

interface ProductRate {
  id: string;
  minQuantity: number;
  rate: number;
}

interface Product {
  id: string;
  name: string;
  bottlesPerCrate: number;
  rates: ProductRate[];
}

interface VisitItem {
  productId: string;
  productName: string;
  crates: number;
  looseBottles?: number;
  rate?: number;
  standardRate?: number;
  actualRate?: number;
  amount: number;
}

interface TodayVisit {
  visitId: string;
  visitedAt: string;
  formattedTime: string;
  isNoSale: boolean;
  noSaleReason: string | null;
  saleAmount: number;
  receivedAmount: number;
  dueFromSale: number;
  items: VisitItem[];
}

interface Customer {
  id: string;
  customerName: string;
  contact: string | null;
  address?: string;
  routeId: string;
  route: { id: string; name: string };
  outstanding: number;
  isVisitedToday: boolean;
  todayVisit: TodayVisit | null;
}

export default function SalesmanCustomerList({
  initialCustomers,
  products = [],
  routeId,
  routeName,
}: {
  initialCustomers: Customer[];
  products?: Product[];
  routeId?: string;
  routeName?: string;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');

  // Active visit modal state
  const [activeCustomerForVisit, setActiveCustomerForVisit] = useState<Customer | null>(null);
  
  // View visit modal state
  const [activeCustomerForView, setActiveCustomerForView] = useState<Customer | null>(null);

  // Success toast/message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  // Filter customers by search term
  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      c.customerName.toLowerCase().includes(term) ||
      (c.contact && c.contact.includes(term)) ||
      (c.route?.name && c.route.name.toLowerCase().includes(term))
    );
  });

  // Sort into: FIRST: Not Visited Today, THEN: Visited Today
  const pendingCustomers = filteredCustomers.filter(c => !c.isVisitedToday);
  const completedCustomers = filteredCustomers.filter(c => c.isVisitedToday);

  const handleVisitComplete = (customerId: string, visitData: TodayVisit) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          isVisitedToday: true,
          todayVisit: visitData,
          outstanding: c.outstanding + visitData.dueFromSale
        };
      }
      return c;
    }));

    setActiveCustomerForVisit(null);
    setToastMessage(`Visit completed for ${activeCustomerForVisit?.customerName || 'customer'}!`);
    setTimeout(() => setToastMessage(null), 4000);

    router.refresh();
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in-up">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-5 w-5" />
          {toastMessage}
        </div>
      )}

      {/* Header & Search */}
      <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {routeName || (routeId && customers.length > 0 ? customers[0].route.name : 'My Customers')}
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {pendingCustomers.length} pending • {completedCustomers.length} visited today
            </p>
          </div>
        </div>
        
        <div className="relative">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer name or phone..." 
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-alvoun-blue/50 focus:border-alvoun-blue transition-all placeholder-slate-400 font-medium"
          />
          <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-4 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <MapPin className="h-8 w-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No customers found</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {searchTerm ? 'Try adjusting your search terms.' : 'No customers assigned in this area.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: TODAY'S ROUTE (NOT VISITED TODAY) */}
          {pendingCustomers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  <h2 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    TODAY&apos;S ROUTE
                  </h2>
                </div>
                <span className="text-xs font-bold text-alvoun-blue bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full">
                  {pendingCustomers.length} Remaining
                </span>
              </div>

              <div className="space-y-4">
                {pendingCustomers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 mr-2">
                        <Link 
                          href={`/dashboard/salesman/customers/${customer.id}`}
                          className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight hover:text-alvoun-blue transition-colors block mb-1"
                        >
                          {customer.customerName}
                        </Link>
                        <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 gap-2 mb-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {customer.route?.name || 'Assigned Area'}
                          </span>
                          {customer.contact && (
                            <span className="flex items-center gap-1 text-slate-400">
                              • <Phone className="h-3 w-3" /> {customer.contact}
                            </span>
                          )}
                        </div>

                        {/* Outstanding dues */}
                        <div className="text-sm font-bold mt-1">
                          <span className="text-slate-500 dark:text-slate-400">Outstanding: </span>
                          <span className={customer.outstanding > 0 ? 'text-alvoun-red font-black' : 'text-slate-900 dark:text-slate-100'}>
                            {formatMoney(Math.abs(customer.outstanding))}
                            {customer.outstanding !== 0 && (
                              <span className="text-[10px] ml-1 uppercase">{customer.outstanding > 0 ? 'Dr' : 'Cr'}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge: NOT VISITED */}
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <CircleDot className="h-3 w-3 text-slate-400" />
                          NOT VISITED
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
                      {customer.contact ? (
                        <a 
                          href={`tel:${customer.contact}`} 
                          className="flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider active:bg-slate-100 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          CALL
                        </a>
                      ) : (
                        <Link 
                          href={`/dashboard/salesman/customers/${customer.id}`} 
                          className="flex items-center justify-center gap-1.5 py-3 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider active:bg-slate-100 transition-colors"
                        >
                          + ADD PHONE
                        </Link>
                      )}
                      
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCustomerForVisit(customer);
                        }}
                        className="flex items-center justify-center gap-1.5 py-3 bg-alvoun-blue text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-alvoun-blue/20 hover:bg-alvoun-dark active:bg-alvoun-dark transition-colors"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        START VISIT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: COMPLETED (VISITED TODAY) */}
          {completedCustomers.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h2 className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    COMPLETED
                  </h2>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                  {completedCustomers.length} Visited
                </span>
              </div>

              <div className="space-y-4">
                {completedCustomers.map((customer) => {
                  const visit = customer.todayVisit;
                  return (
                    <div 
                      key={customer.id} 
                      className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 p-4 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 mr-2">
                          <Link 
                            href={`/dashboard/salesman/customers/${customer.id}`}
                            className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5 mb-1"
                          >
                            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                            <span>{customer.customerName}</span>
                          </Link>
                          <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 gap-2 mb-2">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {customer.route?.name || 'Assigned Area'}
                            </span>
                            {customer.contact && (
                              <span className="flex items-center gap-1 text-slate-400">
                                • <Phone className="h-3 w-3" /> {customer.contact}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge: VISITED TODAY */}
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 whitespace-nowrap">
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            VISITED TODAY
                          </span>
                        </div>
                      </div>

                      {/* Visit Details Summary */}
                      <div className="mt-2.5 mb-1 p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-xs">
                        <div className="text-slate-500 dark:text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>Visited: {visit?.formattedTime || 'Today'}</span>
                        </div>

                        {visit?.isNoSale ? (
                          <div className="font-bold text-slate-700 dark:text-slate-300">
                            Visit completed • <span className="text-slate-500">No sale ({visit.noSaleReason || 'No sale'})</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 pt-1 font-semibold text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Sale</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(visit?.saleAmount || 0)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Received</span>
                              <span className="font-bold text-alvoun-green">{formatMoney(visit?.receivedAmount || 0)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Due</span>
                              <span className="font-bold text-alvoun-red">{formatMoney(visit?.dueFromSale || 0)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-emerald-100 dark:border-emerald-900/30">
                        {customer.contact ? (
                          <a 
                            href={`tel:${customer.contact}`} 
                            className="flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider active:bg-slate-100 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            CALL
                          </a>
                        ) : (
                          <div className="flex items-center justify-center py-3 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 rounded-xl text-xs font-semibold">
                            No Phone
                          </div>
                        )}
                        
                        <button 
                          type="button"
                          onClick={() => setActiveCustomerForView(customer)}
                          className="flex items-center justify-center gap-1.5 py-3 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          VIEW VISIT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: START VISIT FLOW */}
      {activeCustomerForVisit && (
        <InteractiveVisitModal
          customer={activeCustomerForVisit}
          products={products}
          onClose={() => setActiveCustomerForVisit(null)}
          onComplete={(visitData) => handleVisitComplete(activeCustomerForVisit.id, visitData)}
        />
      )}

      {/* MODAL 2: VIEW VISIT DETAILS (READ ONLY) */}
      {activeCustomerForView && (
        <ViewVisitModal
          customer={activeCustomerForView}
          onClose={() => setActiveCustomerForView(null)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Interactive Visit Modal (Start Visit -> Order -> Payment)
// -------------------------------------------------------------
function InteractiveVisitModal({
  customer,
  products = [],
  onClose,
  onComplete,
}: {
  customer: Customer;
  products?: Product[];
  onClose: () => void;
  onComplete: (visitData: TodayVisit) => void;
}) {
  type Step = 'START' | 'ORDER' | 'PAYMENT';
  const [step, setStep] = useState<Step>('START');
  const [isNoSale, setIsNoSale] = useState(false);
  const [noSaleReason, setNoSaleReason] = useState('Shop Closed');
  
  // Order State: productId -> crates
  const [order, setOrder] = useState<Record<string, number>>({});
  
  // Payment State
  const [receivedNowStr, setReceivedNowStr] = useState<string>('');
  
  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  // Computed
  const orderItems = safeProducts.map(p => {
    const crates = order[p.id] || 0;
    const rates = Array.isArray(p.rates) ? p.rates : [];
    const applicableRate = rates.find((r: any) => crates >= r.minQuantity) || rates[rates.length - 1];
    const rateToUse = applicableRate ? applicableRate.rate : 0;
    const amount = crates * rateToUse;
    return { ...p, crates, rateToUse, amount };
  }).filter(p => p.crates > 0);

  const totalSaleAmount = orderItems.reduce((sum, item) => sum + item.amount, 0);
  const receivedNowCents = receivedNowStr ? Math.round(parseFloat(receivedNowStr) * 100) : 0;
  const dueFromSale = Math.max(0, totalSaleAmount - receivedNowCents);
  const currentOutstanding = customer?.outstanding ?? 0;
  const finalOutstanding = currentOutstanding + dueFromSale;

  const handleCrateChange = (productId: string, delta: number) => {
    setOrder(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleCompleteVisit = async (isNoSaleFlow: boolean = false) => {
    setLoading(true);
    setError(null);

    if (!isNoSaleFlow && receivedNowCents > totalSaleAmount) {
      setError("Received amount cannot exceed today's sale amount.");
      setLoading(false);
      return;
    }

    const payload = {
      customerId: customer.id,
      isNoSale: isNoSaleFlow,
      noSaleReason: isNoSaleFlow ? noSaleReason : undefined,
      items: isNoSaleFlow ? [] : orderItems.map(i => ({ productId: i.id, crates: i.crates })),
      receivedNow: isNoSaleFlow ? 0 : receivedNowCents
    };

    try {
      const res = await submitVisitFlow(payload);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else if (res?.visit) {
        onComplete(res.visit as TodayVisit);
      } else {
        // Fallback construct
        const fallbackVisit: TodayVisit = {
          visitId: 'new',
          visitedAt: new Date().toISOString(),
          formattedTime: 'Today, Just now',
          isNoSale: isNoSaleFlow,
          noSaleReason: isNoSaleFlow ? noSaleReason : null,
          saleAmount: isNoSaleFlow ? 0 : totalSaleAmount,
          receivedAmount: isNoSaleFlow ? 0 : receivedNowCents,
          dueFromSale: isNoSaleFlow ? 0 : dueFromSale,
          items: orderItems.map(i => ({
            productId: i.id,
            productName: i.name,
            crates: i.crates,
            looseBottles: 0,
            rate: i.rateToUse,
            amount: i.amount
          }))
        };
        onComplete(fallbackVisit);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete visit.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div>
            <span className="text-[10px] font-bold text-alvoun-blue uppercase tracking-wider block">
              {step === 'START' ? 'Customer Visit' : step === 'ORDER' ? 'Step 2: Take Order' : 'Step 3: Collect Payment'}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-[280px]">
              {customer.customerName}
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: START */}
          {step === 'START' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-alvoun-blue">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{customer.customerName}</h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{customer.route?.name}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Outstanding</span>
                <span className={`text-2xl font-black ${customer.outstanding > 0 ? 'text-alvoun-red' : 'text-slate-900 dark:text-slate-100'}`}>
                  {formatMoney(Math.abs(customer.outstanding))}
                  {customer.outstanding !== 0 && (
                    <span className="text-xs ml-1 font-bold">{customer.outstanding > 0 ? 'Dr' : 'Cr'}</span>
                  )}
                </span>
              </div>

              {!isNoSale ? (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('ORDER')}
                    className="w-full py-4 bg-alvoun-blue text-white rounded-xl font-bold text-base shadow-lg shadow-alvoun-blue/20 active:bg-alvoun-dark transition-colors"
                  >
                    TAKE ORDER
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNoSale(true)}
                    className="w-full py-3.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm active:bg-slate-200 dark:active:bg-slate-800 transition-colors"
                  >
                    NO SALE TODAY
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Reason for No Sale:
                    </label>
                    <select
                      value={noSaleReason}
                      onChange={(e) => setNoSaleReason(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option>Shop Closed</option>
                      <option>Sufficient Stock</option>
                      <option>Owner Unavailable</option>
                      <option>Payment Pending</option>
                      <option>Price Dispute</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleCompleteVisit(true)}
                      className="flex-1 py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'COMPLETE VISIT (NO SALE)'}
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setIsNoSale(false)}
                      className="px-4 py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-sm"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ORDER */}
          {step === 'ORDER' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {safeProducts.map(p => (
                  <div key={p.id} className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{p.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{p.bottlesPerCrate} bottles/crate</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => handleCrateChange(p.id, -1)}
                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg active:bg-slate-200 border border-slate-200 dark:border-slate-700"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-lg font-black w-6 text-center text-slate-900 dark:text-slate-100">
                        {order[p.id] || 0}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleCrateChange(p.id, 1)}
                        className="w-10 h-10 flex items-center justify-center bg-alvoun-blue text-white rounded-lg active:bg-alvoun-dark"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary & Navigation */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4 p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Crates</span>
                    <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {orderItems.reduce((acc, curr) => acc + curr.crates, 0)} crates
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sale Amount</span>
                    <span className="text-xl font-black text-alvoun-blue">{formatMoney(totalSaleAmount)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('START')}
                    className="px-4 py-3.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={totalSaleAmount === 0}
                    onClick={() => setStep('PAYMENT')}
                    className="flex-1 py-3.5 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50"
                  >
                    CONTINUE TO PAYMENT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {step === 'PAYMENT' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Today&apos;s Sale</span>
                <span className="text-3xl font-black block mb-4">{formatMoney(totalSaleAmount)}</span>

                <div className="bg-white/10 rounded-xl p-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Received Cash Now (₹)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={receivedNowStr}
                    onChange={(e) => setReceivedNowStr(e.target.value)}
                    className="w-full bg-transparent text-2xl font-black text-white placeholder-white/30 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Previous Balance</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatMoney(customer.outstanding)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Today&apos;s Sale</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">+{formatMoney(totalSaleAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span>Received Now</span>
                  <span className="font-bold">-{formatMoney(receivedNowCents)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Due from Today&apos;s Sale</span>
                  <span className="font-black text-alvoun-red">{formatMoney(dueFromSale)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep('ORDER')}
                  className="px-4 py-3.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCompleteVisit(false)}
                  className="flex-1 py-3.5 bg-alvoun-blue text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'COMPLETE VISIT'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Read-only View Visit Modal (Requirement 7)
// -------------------------------------------------------------
function ViewVisitModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const visit = customer.todayVisit;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Today&apos;s Visit Details
              </h2>
              <p className="text-xs text-slate-500">{customer.customerName} ({customer.route?.name})</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Timing Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="font-semibold">{visit?.formattedTime || 'Visited Today'}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
              <Check className="h-3 w-3" /> COMPLETED
            </span>
          </div>

          {/* Visit Result: Sale vs No Sale */}
          {visit?.isNoSale ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Visit Outcome</span>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">No Sale Recorded</p>
              <p className="text-xs text-slate-500 font-medium">Reason: {visit.noSaleReason || 'No sale'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Products Purchased Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Products Purchased
                </h4>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5 text-center">Crates</th>
                        <th className="px-3 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {visit?.items && visit.items.length > 0 ? (
                        visit.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                              {item.productName}
                              {item.rate ? (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  @ {formatMoney(item.rate)}/crate
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                              {item.crates}
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-slate-100">
                              {formatMoney(item.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                            Sale details recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="font-medium">Total Sale</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(visit?.saleAmount || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span className="font-medium">Payment Received</span>
                  <span className="font-bold">-{formatMoney(visit?.receivedAmount || 0)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-900 dark:text-slate-100">Due from this sale</span>
                  <span className="font-black text-alvoun-red">{formatMoney(visit?.dueFromSale || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Existing Customer Outstanding */}
          <div className="p-3.5 bg-slate-100/70 dark:bg-slate-900/40 rounded-xl flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Total Customer Outstanding</span>
            <span className={`font-black text-base ${customer.outstanding > 0 ? 'text-alvoun-red' : 'text-slate-900 dark:text-slate-100'}`}>
              {formatMoney(Math.abs(customer.outstanding))}
              {customer.outstanding !== 0 && (
                <span className="text-[10px] ml-1 uppercase">{customer.outstanding > 0 ? 'Dr' : 'Cr'}</span>
              )}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
