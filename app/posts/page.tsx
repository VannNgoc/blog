// app/posts/page.tsx
import {getPosts, getPostsCount, getSearchedPosts, getSearchedPostsCount} from "@/lib/posts/queries";
import { PostCard } from "@/ui/posts/PostCard";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import {PostsNavBar} from "@/ui/posts/PostsNavBar";
import { Search } from "@/ui/posts/Search";
import { auth } from '@/lib/auth/server';
import { BlurFade } from "@/components/magicui/blur-fade";

export const dynamic = 'force-dynamic';

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  // auth.getSession() and searchParams don't depend on each other, and
  // neither does the posts/count query pair below — running each pair in
  // parallel instead of four sequential awaits cuts the round trips this
  // force-dynamic page pays on every request roughly in half.
  const [{ data: session }, { page: pageParam, q }] = await Promise.all([
    auth.getSession(),
    searchParams,
  ]);
  const page = Number(pageParam) || 1;

  const [posts, postCount] = await Promise.all([
    q ? getSearchedPosts(q, undefined, page) : getPosts(session?.user.id, page),
    q ? getSearchedPostsCount(q) : getPostsCount({ isPublic: true }),
  ]);

  return (
    <main className="container mx-auto p-4">
      <div className="my-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Shared Posts</h1>
        {session?.user && <CreatePostButton/>}
      </div>
      <Search/>
      {posts.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          {q ? `No posts match "${q}".` : "No posts yet."}
        </p>
      ) : (
        <ul className="space-y-4 mt-6">
          {posts.map((p, i) => (
            <BlurFade key={p.id} delay={i * 0.07} yOffset={4}>
              <PostCard post={p} isAuthor={p.post_author === session?.user.id}/>
            </BlurFade>
          ))}
        </ul>
      )}
      <PostsNavBar numberPosts={postCount}/>
    </main>
  );
}