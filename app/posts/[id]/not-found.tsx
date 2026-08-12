import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Post not found</h1>
      <p className="text-muted-foreground mb-4">The post you are looking for does not exist.</p>
      <Link href="/posts" className="text-muted-foreground underline-offset-4 hover:underline">
        Back to posts
      </Link>
    </main>
  );
}