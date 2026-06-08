import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Post not found</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">The post you are looking for does not exist.</p>
      <Link href="/posts" className="text-zinc-700 dark:text-zinc-300 underline-offset-4 hover:underline">
        Back to posts
      </Link>
    </main>
  );
}