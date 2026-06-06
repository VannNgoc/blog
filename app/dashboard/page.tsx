import { getUserPosts, getUserPostsCount } from "@/lib/posts/queries";
import { PostCard } from "@/ui/posts/PostCard";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import { PostsNavBar } from "@/ui/posts/PostsNavBar";
import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { data: session } = await auth.getSession();
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const posts = session?.user ? await getUserPosts(session.user.id, page) : [];
  const postCount = session?.user ? await getUserPostsCount(session.user.id) : 0;

  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Posts</h1>
      {session?.user && <CreatePostButton/>}
      <PostsNavBar numberPosts={Number(postCount)}/>
      <ul className="space-y-4 mt-6">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} isAuthor={p.post_author === session?.user.id}/>
        ))}
      </ul>
    </main>
  );
}
