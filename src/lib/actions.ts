'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', Object.fromEntries(formData));
  } catch (error: any) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') {
        return 'Invalid credentials.';
      }
      if (error.cause?.err?.message) {
        return error.cause.err.message;
      }
      return 'Something went wrong.';
    }
    throw error;
  }
}
