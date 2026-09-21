'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Clock, ShoppingCart, IndianRupee, MapPin } from 'lucide-react';
import { formatMoney } from '@/lib/format';

export default function LiveDashboardManager() {
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: any;

    const connect = () => {
      evtSource = new EventSource('/api/admin/live');

      evtSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'INITIAL_LOGS') {
            // Sort ascending by time so the newest is at bottom (or we reverse for top)
            setActivities(payload.data.map((d: any) => ({
              id: d.id,
              salesmanName: d.salesman?.name || 'Unknown',
              type: d.type,
              description: d.description,
              timestamp: d.createdAt,
              metadata: d.metadata ? JSON.parse(d.metadata) : null
            })));
          } else if (payload.type === 'ACTIVITY') {
            const act = payload.data;
            
            // Add to feed (newest at top)
            setActivities(prev => [act, ...prev].slice(0, 50));
            
            // Check if it's a notification-worthy event
            if (act.type === 'SALE' && act.metadata?.amount >= 1000000) {
              addToast(`Large Order: ${formatMoney(act.metadata.amount)} by ${act.salesmanName}`);
            } else if (act.type === 'PAYMENT' && act.metadata?.amount >= 500000) {
              addToast(`High Value Collection: ${formatMoney(act.metadata.amount)} by ${act.salesmanName}`);
            }

            // Trigger silent background refresh of Server Components
            router.refresh();
          }
        } catch (e) {}
      };

      evtSource.onerror = () => {
        evtSource?.close();
        // Exponential backoff or simple 5s retry
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      evtSource?.close();
      clearTimeout(retryTimeout);
    };
  }, [router]);

  const addToast = (msg: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      case 'PAYMENT': return <IndianRupee className="h-4 w-4 text-indigo-500" />;
      case 'VISIT_START':
      case 'VISIT_END': return <MapPin className="h-4 w-4 text-alvoun-blue" />;
      default: return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <>
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up">
            <Bell className="h-5 w-5 text-alvoun-amber" />
            <span className="text-sm font-medium">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Live Activity Feed</h2>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
              <Clock className="h-8 w-8 mb-2 opacity-20" />
              Waiting for live activities...
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map((act, i) => (
                <div key={act.id || i} className="flex gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <div className="mt-0.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full h-fit">
                    {getIcon(act.type)}
                  </div>
                  <div>
                    <p className="text-sm text-slate-800 dark:text-slate-200">
                      <span className="font-semibold">{act.salesmanName}</span>: {act.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
