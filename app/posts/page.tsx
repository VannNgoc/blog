// app/posts/page.tsx
import { getPosts, getPostCount } from "@/lib/posts/queries";
import Link from "next/link";
import { PostCard } from "@/ui/posts/PostCard";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ data: session }, posts, totalCount] = await Promise.all([
    auth.getSession(),
    getPosts({ page }),
    getPostCount(),
  ]);

  const totalPages = Math.ceil(totalCount / 10);

  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Posts</h1>
      {session?.user && <CreatePostButton/>}
      <ul className="space-y-4 mt-6">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} currentUserId={session?.user?.id}/>
        ))}
      </ul>
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={`/posts?page=${page - 1}`}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">Previous</span>
          )}
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{page} / {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={`/posts?page=${page + 1}`}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">Next</span>
          )}
        </div>
      )}
    </main>
  );
}
