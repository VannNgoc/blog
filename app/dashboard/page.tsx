import { Suspense } from "react";
import { getUserPosts, getUserPostsCount, getSearchedPosts, getSearchedPostsCount } from "@/lib/posts/queries";
import { PostCard } from "@/ui/posts/PostCard";
import { PostListSkeleton } from "@/ui/posts/PostListSkeleton";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import { PostsNavBar } from "@/ui/posts/PostsNavBar";
import { auth } from '@/lib/auth/server';
import { Search } from "@/ui/posts/Search";
export const dynamic = 'force-dynamic';

async function DashboardPostList({ userId, page, q }: { userId: string | undefined; page: number; q: string | undefined }) {
  const posts = q
    ? await getSearchedPosts(q, userId, page)
    : userId
      ? await getUserPosts(userId, page)
      : [];

  if (posts.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        {q ? `No posts match "${q}".` : "You haven't written any posts yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-4 mt-6">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} isAuthor={p.post_author === userId} showAccessBadge/>
      ))}
    </ul>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const { data: session } = await auth.getSession();
  const { page: pageParam, q } = await searchParams;
  const page = Number(pageParam) || 1;

  const postCount = q
    ? await getSearchedPostsCount(q, session?.user.id)
    : session?.user
      ? await getUserPostsCount(session.user.id)
      : 0;

  return (
    <main className="container mx-auto p-4">
      <div className="my-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Posts</h1>
        {session?.user && <CreatePostButton/>}
      </div>
      <Search/>
      <Suspense key={`${q ?? ''}-${page}`} fallback={<PostListSkeleton />}>
        <DashboardPostList userId={session?.user.id} page={page} q={q} />
      </Suspense>
      <PostsNavBar numberPosts={Number(postCount)}/>
    </main>
  );
}
