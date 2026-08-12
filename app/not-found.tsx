import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="text-muted-foreground mb-4">The page you are looking for does not exist.</p>
      <Link href="/" className="text-muted-foreground underline-offset-4 hover:underline">
        Back home
      </Link>
    </main>
  );
}
