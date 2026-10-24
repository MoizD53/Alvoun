'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ShoppingCart, IndianRupee, MapPin } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { useToast } from '@/components/ui/toast';

export default function LiveDashboardManager() {
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: any;

    const connect = () => {
      evtSource = new EventSource('/api/admin/live');

      evtSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'INITIAL_LOGS') {
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
            
            // Trigger toast notification if high value
            if (act.type === 'SALE' && act.metadata?.amount >= 1000000) {
              toast({
                title: 'High Value Order',
                description: `${formatMoney(act.metadata.amount)} booked by ${act.salesmanName}`,
                variant: 'success'
              });
            } else if (act.type === 'PAYMENT' && act.metadata?.amount >= 500000) {
              toast({
                title: 'Collection Received',
                description: `${formatMoney(act.metadata.amount)} collected by ${act.salesmanName}`,
                variant: 'info'
              });
            }

            // Trigger silent background refresh of Server Components
            // router.refresh(); (Page refresh is handled centrally & throttled by AdminLiveListener)
          }
        } catch (e) {}
      };

      evtSource.onerror = () => {
        evtSource?.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      evtSource?.close();
      clearTimeout(retryTimeout);
    };
  }, [router, toast]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <ShoppingCart className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      case 'PAYMENT': return <IndianRupee className="h-4 w-4 text-success" />;
      case 'VISIT_START':
      case 'VISIT_END': return <MapPin className="h-4 w-4 text-warning" />;
      default: return <Clock className="h-4 w-4 text-muted" />;
    }
  };

  return (
    <div className="bg-surface-raised rounded-2xl border border-border-default shadow-raised overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-surface-raised">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
          </div>
          <h2 className="text-sm font-bold text-primary tracking-tight">Live Activity Feed</h2>
        </div>
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Real-time Stream</span>
      </div>
      
      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary text-xs">
            <Clock className="h-8 w-8 mb-2 opacity-30 text-muted" />
            Waiting for live field activities...
          </div>
        ) : (
          activities.map((act, i) => (
            <div key={act.id || i} className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-surface-inset/60 transition-colors">
              <div className="mt-0.5 bg-surface-inset border border-border-default shadow-inset p-2 rounded-xl shrink-0">
                {getIcon(act.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary leading-snug">
                  <span className="font-bold">{act.salesmanName}</span>: {act.description}
                </p>
                <p className="text-[10px] font-mono text-muted mt-1">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
