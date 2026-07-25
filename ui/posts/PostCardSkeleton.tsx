export function PostCardSkeleton() {
  return (
    <li className="relative rounded-lg border border-zinc-200 border-l-4 border-l-zinc-200 p-4 dark:border-zinc-700 dark:border-l-zinc-700">
      <div className="skeleton mb-2 h-5 w-2/3 rounded" />
      <div className="skeleton mb-3 h-4 w-1/3 rounded" />
      <div className="skeleton mb-2 h-4 w-full rounded" />
      <div className="skeleton mb-2 h-4 w-full rounded" />
      <div className="skeleton mb-3 h-4 w-2/3 rounded" />
      <div className="skeleton h-4 w-24 rounded" />
    </li>
  );
}
