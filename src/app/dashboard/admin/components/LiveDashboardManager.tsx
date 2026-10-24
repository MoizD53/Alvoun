'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatMoney } from '@/lib/format';
import { Activity, ShoppingCart, DollarSign, MapPin, UserCheck, AlertCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  salesmanName: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export default function LiveDashboardManager() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Populate cached initial logs if available from AdminLiveListener
    if (typeof window !== 'undefined' && (window as any).__alvounLatestInitialLogs) {
      const initLogs = (window as any).__alvounLatestInitialLogs;
      setActivities(initLogs.map((d: any) => ({
        id: d.id,
        salesmanName: d.salesman?.name || d.salesmanName || 'Salesman',
        type: d.type,
        description: d.description,
        timestamp: d.timestamp || d.createdAt,
        metadata: d.metadata
      })));
    }

    const handleLiveEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      if (!payload) return;

      if (payload.type === 'INITIAL_LOGS') {
        setActivities(payload.data.map((d: any) => ({
          id: d.id,
          salesmanName: d.salesman?.name || d.salesmanName || 'Salesman',
          type: d.type,
          description: d.description,
          timestamp: d.timestamp || d.createdAt,
          metadata: d.metadata
        })));
      } else if (payload.type === 'ACTIVITY') {
        const act = payload.data;
        setActivities(prev => [act, ...prev].slice(0, 50));

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
      }
    };

    window.addEventListener('alvoun:live-event', handleLiveEvent);
    return () => {
      window.removeEventListener('alvoun:live-event', handleLiveEvent);
    };
  }, [router, toast]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      case 'PAYMENT': return <DollarSign className="h-4 w-4 text-brand-teal" />;
      case 'VISIT': return <UserCheck className="h-4 w-4 text-brand-teal" />;
      case 'LOCATION': return <MapPin className="h-4 w-4 text-text-muted" />;
      default: return <Activity className="h-4 w-4 text-amber-500" />;
    }
  };

  const getRelativeTime = (isoString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <Card className="rounded-2xl border-border-subtle bg-surface shadow-subtle flex flex-col h-full max-h-[420px]">
      <CardHeader className="p-4 pb-2 border-b border-border-subtle flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-teal"></span>
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-text-muted">Live Field Stream</CardTitle>
        </div>
        <Badge variant="neutral" className="text-[10px] font-mono border-brand-teal/20 text-brand-teal bg-brand-teal/5">
          Real-Time
        </Badge>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-border-subtle/50">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-text-muted flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6 text-text-muted/40" />
            <p className="text-xs font-semibold">Waiting for live activities...</p>
          </div>
        ) : (
          activities.map((act) => (
            <div key={act.id} className="p-3 hover:bg-surface-sunken/40 transition flex items-start gap-3">
              <div className="p-1.5 bg-surface-sunken rounded-lg mt-0.5">
                {getIcon(act.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-foreground truncate">{act.salesmanName}</span>
                  <span className="text-[10px] font-mono text-text-muted whitespace-nowrap">
                    {getRelativeTime(act.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary truncate mt-0.5">{act.description}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
