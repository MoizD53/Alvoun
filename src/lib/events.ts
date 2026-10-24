import { EventEmitter } from 'events';
import { prisma } from './db';
import { invalidateDashboardCache } from './cache/dashboard-cache';

export type AppEvent = {
  id: string;
  salesmanId: string;
  salesmanName: string;
  type: string;
  description: string;
  metadata?: any;
  timestamp: string;
};

// Create a global singleton event emitter and in-memory activity ring buffer
const globalForEvents = globalThis as unknown as {
  sseEmitter: EventEmitter | undefined;
  recentActivitiesBuffer: AppEvent[] | undefined;
};

export const sseEmitter = globalForEvents.sseEmitter ?? new EventEmitter();
const recentActivities = globalForEvents.recentActivitiesBuffer ?? [];

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.sseEmitter = sseEmitter;
  globalForEvents.recentActivitiesBuffer = recentActivities;
}

/**
 * Return recent activities from the in-memory ring buffer.
 * If empty on initial cold start, queries DB once and populates memory.
 * Subsequent reconnects consume 0 database reads!
 */
export async function getRecentActivities(): Promise<AppEvent[]> {
  if (recentActivities.length > 0) {
    return recentActivities.slice(0, 10);
  }

  try {
    const dbLogs = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { salesman: { select: { name: true } } }
    });

    const mapped: AppEvent[] = dbLogs.map(l => ({
      id: l.id,
      salesmanId: l.salesmanId,
      salesmanName: l.salesman?.name || 'Salesman',
      type: l.type,
      description: l.description,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
      timestamp: l.createdAt.toISOString()
    }));

    recentActivities.push(...mapped);
    return mapped;
  } catch {
    return [];
  }
}

// Log the activity to DB and emit to SSE clients
export async function logAndEmitActivity(params: {
  salesmanId: string;
  salesmanName: string;
  type: string;
  description: string;
  metadata?: any;
}) {
  const { salesmanId, salesmanName, type, description, metadata } = params;
  
  // 1. Save to DB
  const log = await prisma.activityLog.create({
    data: {
      salesmanId,
      type,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });

  // 2. Format for SSE
  const event: AppEvent = {
    id: log.id,
    salesmanId,
    salesmanName,
    type,
    description,
    metadata,
    timestamp: log.createdAt.toISOString()
  };

  // Add to in-memory buffer (keep up to 30)
  recentActivities.unshift(event);
  if (recentActivities.length > 30) {
    recentActivities.pop();
  }

  // 3. Invalidate shared dashboard cache on financial/stock/sales mutations
  if (['SALE', 'PAYMENT', 'EXPENSE', 'PRODUCTION', 'STOCK', 'CUSTOMER_CREATED'].includes(type)) {
    invalidateDashboardCache();
  }

  // 4. Emit to active SSE connections
  sseEmitter.emit('activity', event);
}
