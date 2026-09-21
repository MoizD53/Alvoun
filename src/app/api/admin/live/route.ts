export const dynamic = 'force-dynamic';
export const maxDuration = 300; // max allowed by Vercel for hobby/pro if applicable

import { auth } from '@/auth';
import { sseEmitter } from '@/lib/events';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial latest activities so the feed isn't completely empty on reload
      const recentLogs = await prisma.activityLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
      
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // Stream might be closed
        }
      };

      // Send initial data wrapped as a special event
      sendEvent({ type: 'INITIAL_LOGS', data: recentLogs });

      // Listen for new events
      const activityListener = (event: any) => {
        sendEvent({ type: 'ACTIVITY', data: event });
      };

      sseEmitter.on('activity', activityListener);

      // Keep connection alive
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch (e) {
          clearInterval(keepAlive);
        }
      }, 30000);

      req.signal.addEventListener('abort', () => {
        sseEmitter.off('activity', activityListener);
        clearInterval(keepAlive);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Prevent Nginx buffering
    }
  });
}
