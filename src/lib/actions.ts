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
      if (error.cause?.err?.message?.includes('Salesman login is available')) {
        return error.cause.err.message;
      }
      if (error.type === 'CredentialsSignin') {
        return 'Invalid credentials.';
      }
      return 'Something went wrong.';
    }
    if (error.message?.includes('Salesman login is available')) {
      return error.message;
    }
    throw error;
  }
}
