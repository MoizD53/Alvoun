export const dynamic = 'force-dynamic';
export const maxDuration = 25; // Clean serverless window preventing 300s timeouts

import { auth } from '@/auth';
import { sseEmitter } from '@/lib/events';
import { prisma } from '@/lib/db';
import { isFinancialRole } from '@/lib/rbac';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !isFinancialRole(session.user.role)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // Stream closed
        }
      };

      // Send initial latest activities so the feed isn't completely empty
      try {
        const recentLogs = await prisma.activityLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' }
        });
        sendEvent({ type: 'INITIAL_LOGS', data: recentLogs });
      } catch (err) {
        // Continue stream even if initial query fails
      }

      // Listen for new events
      const activityListener = (event: any) => {
        sendEvent({ type: 'ACTIVITY', data: event });
      };

      sseEmitter.on('activity', activityListener);

      // Keep connection alive every 8 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch (e) {
          clearInterval(keepAlive);
        }
      }, 8000);

      // Cleanly close stream after 20s so Vercel serverless function finishes without error
      const timeout = setTimeout(() => {
        cleanup();
        try {
          controller.close();
        } catch {}
      }, 20000);

      const cleanup = () => {
        sseEmitter.off('activity', activityListener);
        clearInterval(keepAlive);
        clearTimeout(timeout);
      };

      req.signal.addEventListener('abort', cleanup);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
