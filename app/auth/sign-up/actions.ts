'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { createUser } from '@/lib/users/actions';

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
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