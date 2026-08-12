'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';

const SIGN_IN_LIMIT = 10;
const SIGN_IN_WINDOW_MS = 10 * 60 * 1000;

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const ip = await getClientIp();
  if (isRateLimited(`sign-in:${ip}`, SIGN_IN_LIMIT, SIGN_IN_WINDOW_MS)) {
    return { error: 'Too many sign-in attempts. Try again in a few minutes.' };
  }

  const { error } = await auth.signIn.email({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    return { error: error.message || 'Failed to sign in. Try again' };
  }

  redirect('/dashboard');
}
