'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Headless client component that listens for SSE activity updates on /api/admin/live
 * and triggers router.refresh() when a genuine business transaction event occurs.
 * 
 * Includes rate-limiting/throttling so that multiple transactions within a short window
 * or multiple connected admins do not cause excessive refresh storms.
 */
export default function AdminLiveListener() {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isActive = true;

    const triggerThrottledRefresh = () => {
      const now = Date.now();
      const elapsed = now - lastRefreshRef.current;
      
      // Throttle: minimum 25s between full server component refreshes
      if (elapsed < 25000) {
        if (!debounceTimerRef.current) {
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            lastRefreshRef.current = Date.now();
            router.refresh();
          }, 25000 - elapsed);
        }
        return;
      }

      lastRefreshRef.current = now;
      router.refresh();
    };

    const connect = () => {
      if (!isActive) return;

      try {
        evtSource = new EventSource('/api/admin/live');

        evtSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'ACTIVITY') {
              const actType = payload.data?.type;
              // Do NOT refresh full page on GPS location or minor telemetry
              if (actType === 'LOCATION' || actType === 'PING') {
                return;
              }
              // Only refresh on business events that alter reports/dashboards
              if (['SALE', 'PAYMENT', 'EXPENSE', 'PRODUCTION', 'STOCK', 'CUSTOMER_CREATED'].includes(actType)) {
                triggerThrottledRefresh();
              }
            }
          } catch {
            // keepalive comment or non-json
          }
        };

        evtSource.onerror = () => {
          if (evtSource) {
            evtSource.close();
            evtSource = null;
          }
          if (isActive) {
            // Reconnect after 5 seconds on normal clean close or temporary disconnect
            retryTimeout = setTimeout(connect, 5000);
          }
        };
      } catch {
        if (isActive) {
          retryTimeout = setTimeout(connect, 8000);
        }
      }
    };

    connect();

    return () => {
      isActive = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (evtSource) evtSource.close();
    };
  }, [router]);

  return null;
}
