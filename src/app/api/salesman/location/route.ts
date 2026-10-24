export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireActiveSalesmanSession } from '@/lib/session';
import { z } from 'zod';

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0)
});

export async function POST(req: Request) {
  try {
    const { salesman, workSession } = await requireActiveSalesmanSession();
    
    const body = await req.json();
    const parsed = LocationSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
    }

    const { latitude, longitude, accuracy } = parsed.data;

    // Reject extremely inaccurate GPS data (optional filtering)
    if (accuracy > 5000) {
      return NextResponse.json({ success: false, message: 'Accuracy too low' });
    }

    // Delta filter: check if the salesman is stationary (< 15 meters) and has reported within 3 mins
    const lastLocation = await prisma.location.findFirst({
      where: { workSessionId: workSession.id },
      orderBy: { recordedAt: 'desc' },
      select: { latitude: true, longitude: true, recordedAt: true }
    });

    if (lastLocation) {
      const now = Date.now();
      const elapsedMs = now - lastLocation.recordedAt.getTime();
      
      // Calculate distance in meters using Haversine formula
      const R = 6371e3;
      const φ1 = (lastLocation.latitude * Math.PI) / 180;
      const φ2 = (latitude * Math.PI) / 180;
      const Δφ = ((latitude - lastLocation.latitude) * Math.PI) / 180;
      const Δλ = ((longitude - lastLocation.longitude) * Math.PI) / 180;
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = R * c;

      // If salesman moved less than 15 meters and last ping was less than 3 minutes ago, skip insert
      if (distanceMeters < 15 && elapsedMs < 180000) {
        return NextResponse.json({ success: true, stationary: true, recordedAt: lastLocation.recordedAt });
      }
    }

    const location = await prisma.location.create({
      data: {
        salesmanId: salesman.id,
        workSessionId: workSession.id,
        latitude,
        longitude,
        accuracy,
        recordedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, recordedAt: location.recordedAt });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
