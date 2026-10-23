'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function verifySessionPassword(password: string) {
  if (!password || !password.trim()) {
    return { success: false, error: 'Password is required' };
  }

  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No active session' };
  }

  const profile = await prisma.profile.findFirst({
    where: {
      isActive: true,
      OR: [
        ...(session.user.id ? [{ id: session.user.id }] : []),
        ...(session.user.email ? [{ email: session.user.email }] : [])
      ]
    }
  });

  if (!profile || !profile.password) {
    return { success: false, error: 'User profile not found' };
  }

  const isValid = await bcrypt.compare(password.trim(), profile.password);
  if (!isValid) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  return { success: true };
}
