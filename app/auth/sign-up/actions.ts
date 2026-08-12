'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { createUser } from '@/lib/users/actions';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';

const SIGN_UP_LIMIT = 5;
const SIGN_UP_WINDOW_MS = 10 * 60 * 1000;

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const ip = await getClientIp();
  if (isRateLimited(`sign-up:${ip}`, SIGN_UP_LIMIT, SIGN_UP_WINDOW_MS)) {
    return { error: 'Too many sign-up attempts. Try again in a few minutes.' };
  }

  const email = formData.get('email') as string;

  if (!email) {
    return { error: "Email address must be provided." }
  }

  const { data, error } = await auth.signUp.email({
    email,
    name: formData.get('name') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    return { error: error.message || 'Failed to create account' };
  }

  if (data?.user) {
    await createUser(data.user);
  }

  redirect('/posts');
}