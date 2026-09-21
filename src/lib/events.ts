import { EventEmitter } from 'events';
import { prisma } from './db';

// Create a global singleton event emitter so it survives HMR in dev
const globalForEvents = globalThis as unknown as {
  sseEmitter: EventEmitter | undefined;
};

export const sseEmitter = globalForEvents.sseEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.sseEmitter = sseEmitter;
}

export type AppEvent = {
  id: string;
  salesmanId: string;
  salesmanName: string;
  type: string;
  description: string;
  metadata?: any;
  timestamp: string;
};

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

  // 3. Emit
  sseEmitter.emit('activity', event);
}
