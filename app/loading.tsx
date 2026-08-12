export default function Loading() {
  return (
    <main id="main-content" className="container mx-auto p-4" aria-live="polite" aria-busy="true">
      <div className="skeleton h-8 w-48 rounded" aria-hidden="true" />
    </main>
  );
}
