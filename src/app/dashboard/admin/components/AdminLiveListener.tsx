'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Headless client component that listens for SSE activity updates on /api/admin/live
 * and triggers router.refresh() so Admin pages (Sessions, Salesmen, Dashboard, etc.)
 * revalidate live without requiring a manual browser refresh (F5).
 */
export default function AdminLiveListener() {
  const router = useRouter();

  useEffect(() => {
    let evtSource: EventSource | null = null;
    let retryTimeout: any = null;

    const connect = () => {
      try {
        evtSource = new EventSource('/api/admin/live');

        evtSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'ACTIVITY') {
              // Trigger seamless background refresh of Server Components
              router.refresh();
            }
          } catch (e) {
            // Ignore parse errors on keepalive comments
          }
        };

        evtSource.onerror = () => {
          evtSource?.close();
          retryTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        retryTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (evtSource) evtSource.close();
    };
  }, [router]);

  return null;
}
