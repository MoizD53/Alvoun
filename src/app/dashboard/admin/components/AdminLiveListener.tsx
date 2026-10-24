'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global Admin Live Activity Controller
 * 
 * - Single source of truth for /api/admin/live SSE connection.
 * - Broadcasts events locally via 'alvoun:live-event' custom event,
 *   allowing LiveDashboardManager to render toasts and feed without opening a duplicate SSE stream.
 * - Visibility-aware: disconnects when tab is hidden/minimized to eliminate background serverless invocations.
 * - Exponential backoff with jitter on reconnects.
 * - Rate-limited throttled router.refresh() for financial/stock mutations only.
 */
export default function AdminLiveListener() {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isActive = true;
    let reconnectAttempts = 0;

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

    const cleanupConnection = () => {
      if (evtSource) {
        evtSource.close();
        evtSource = null;
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    };

    const scheduleReconnect = () => {
      if (!isActive || document.visibilityState !== 'visible') return;
      reconnectAttempts++;
      // Backoff: 5s, 7.5s, 11s, up to max 30s + jitter (0-2s)
      const baseDelay = Math.min(30000, 5000 * Math.pow(1.5, Math.min(reconnectAttempts, 5)));
      const jitter = Math.random() * 2000;
      retryTimeout = setTimeout(connect, baseDelay + jitter);
    };

    const connect = () => {
      if (!isActive) return;
      if (document.visibilityState !== 'visible') return;

      cleanupConnection();

      try {
        evtSource = new EventSource('/api/admin/live');

        evtSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            reconnectAttempts = 0; // reset backoff on active message

            // Cache initial logs for late-mounting components
            if (payload.type === 'INITIAL_LOGS') {
              (window as any).__alvounLatestInitialLogs = payload.data;
            }

            // Broadcast to other components in the tab (e.g. LiveDashboardManager)
            window.dispatchEvent(new CustomEvent('alvoun:live-event', { detail: payload }));

            if (payload.type === 'ACTIVITY') {
              const actType = payload.data?.type;
              // Do NOT refresh on minor telemetry or GPS updates
              if (actType === 'LOCATION' || actType === 'PING') {
                return;
              }
              // Only refresh on business mutations
              if (['SALE', 'PAYMENT', 'EXPENSE', 'PRODUCTION', 'STOCK', 'CUSTOMER_CREATED'].includes(actType)) {
                triggerThrottledRefresh();
              }
            }
          } catch {
            // Keepalive or parse error
          }
        };

        evtSource.onerror = () => {
          cleanupConnection();
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    // Visibility-aware tab lifecycle
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connect();
        triggerThrottledRefresh();
      } else {
        // Tab minimized or in background: close stream to stop Vercel function invocations
        cleanupConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    connect();

    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupConnection();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [router]);

  return null;
}
