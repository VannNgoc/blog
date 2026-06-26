// app/posts/page.tsx
import {getPosts, getPostsCount} from "@/lib/posts/queries";
import { PostCard } from "@/ui/posts/PostCard";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import {PostsNavBar} from "@/ui/posts/PostsNavBar";
import { auth } from '@/lib/auth/server';
import { BlurFade } from "@/components/magicui/blur-fade";

export const dynamic = 'force-dynamic';

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { data: session } = await auth.getSession();
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const posts = await getPosts(session?.user.id, page);
  const postCount = await getPostsCount({ isPublic: true });

  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Posts</h1>
      {session?.user && <CreatePostButton/>}
      <PostsNavBar numberPosts={postCount}/>
      <ul className="space-y-4 mt-6">
        {posts.map((p, i) => (
          <BlurFade key={p.id} delay={i * 0.07} yOffset={4}>
            <PostCard post={p} isAuthor={p.post_author === session?.user.id}/>
          </BlurFade>
        ))}
      </ul>
    </main>
  );
}