'use client' // Error boundaries must be Client Components
 
import { useEffect } from 'react'
import Link from 'next/link';
 
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Something went wrong</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">An unexpected error occurred.</p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="text-zinc-700 dark:text-zinc-300 underline-offset-4 hover:underline"
        >
          Try again
        </button>
        <Link href="/" className="text-zinc-700 dark:text-zinc-300 underline-offset-4 hover:underline">
          Go home
        </Link>
      </div>
    </main>
  )
}