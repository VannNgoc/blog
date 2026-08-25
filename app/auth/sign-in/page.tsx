'use client';

import { useActionState } from 'react';
import { signInWithEmail } from './actions';
import { BlurFade } from '@/components/magicui/blur-fade';
import Link from 'next/link';

const inputClass =
  'block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--muted-foreground) dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500';

export default function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <main id="main-content" className="flex flex-1 items-center justify-center px-4">
      <BlurFade className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-semibold text-foreground">
          Sign in
        </h1>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          )}

          <button type="submit" disabled={isPending} className="btn mt-2 w-full">
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="sign-up" className="text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200">
            Create one
          </Link>
        </p>
      </BlurFade>
    </main>
  );
}
