// app/posts/page.tsx
import {getPosts} from "@/lib/posts/queries";
import Link from "next/link";
import { PostCard } from "@/ui/posts/PostCard";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import { auth } from '@/lib/auth/server';

// Server components using auth methods must be rendered dynamically
export const dynamic = 'force-dynamic';

export default async function PostsPage() {
  const { data: session } = await auth.getSession();
  const posts = await getPosts();
  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Posts</h1>
      {session?.user && <CreatePostButton/>}
      <ul className="space-y-4 mt-6">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} isAuthor={p.post_author === session?.user.id}/>
        ))}
      </ul>
    </main>
  );
}
