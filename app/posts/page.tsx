// app/posts/page.tsx
import {getSearchedPosts, getSearchedPostsCount} from "@/lib/posts/queries";
import { getCachedPublicPosts, getCachedPublicPostsCount } from "@/lib/posts/cached";
import { PostCard } from "@/ui/posts/PostCard";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import {PostsNavBar} from "@/ui/posts/PostsNavBar";
import { Search } from "@/ui/posts/Search";
import { getSession } from '@/lib/auth/session';
import { NavTransition } from "@/ui/NavTransition";

export const dynamic = 'force-dynamic';

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  // getSession() and searchParams don't depend on each other, and
  // neither does the posts/count query pair below — running each pair in
  // parallel instead of four sequential awaits cuts the round trips this
  // force-dynamic page pays on every request roughly in half.
  const [{ data: session }, { page: pageParam, q }] = await Promise.all([
    getSession(),
    searchParams,
  ]);
  const page = Number(pageParam) || 1;

  // The unsearched feed is the same page for every visitor, so it's served
  // from the cache in lib/posts/cached.ts instead of re-querying Neon on
  // every request. Search stays live: it's per-query traffic, not a shared
  // read worth caching.
  const [posts, postCount] = await Promise.all([
    q ? getSearchedPosts(q, undefined, page) : getCachedPublicPosts(page),
    q ? getSearchedPostsCount(q) : getCachedPublicPostsCount(),
  ]);

  return (
    <NavTransition>
    <main id="main-content" className="container mx-auto p-4">
      <div className="my-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Shared Posts</h1>
        {session?.user && <CreatePostButton/>}
      </div>
      <Search/>
      <div aria-live="polite">
        {posts.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {q ? `No posts match "${q}".` : "No posts yet."}
          </p>
        ) : (
          <ul className="space-y-4 mt-6">
            {/* The stagger is what gives the list its cascade, but every card
                sits at opacity 0 until its delay elapses, and an invisible
                element is not a Largest Contentful Paint candidate. Ten cards
                at 0.07s each pushed the last one to 0.63s — and LCP with it.
                Capping at the third card keeps the cascade legible where the
                eye actually lands while bounding the delay at 0.14s. */}
            {posts.map((p, i) => (
              <PostCard
                key={p.id}
                post={p}
                isAuthor={p.post_author === session?.user.id}
                delay={Math.min(i, 2) * 0.07}
              />
            ))}
          </ul>
        )}
      </div>
      <PostsNavBar numberPosts={postCount}/>
    </main>
    </NavTransition>
  );
}