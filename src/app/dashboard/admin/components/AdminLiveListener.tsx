'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Headless client component that listens for SSE activity updates on /api/admin/live
 * and triggers router.refresh() when an actual ACTIVITY event is received.
 */
export default function AdminLiveListener() {
  const router = useRouter();

  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isActive = true;

    const connect = () => {
      if (!isActive) return;

      try {
        evtSource = new EventSource('/api/admin/live');

        evtSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'ACTIVITY') {
              router.refresh();
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
            // Reconnect after 3 seconds on normal clean close or temporary disconnect
            retryTimeout = setTimeout(connect, 3000);
          }
        };
      } catch {
        if (isActive) {
          retryTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isActive = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (evtSource) evtSource.close();
    };
  }, [router]);

  return null;
}
