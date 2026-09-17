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
