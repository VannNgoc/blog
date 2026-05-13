// app/posts/page.tsx
import {getPosts} from "@/lib/posts/queries";
import Link from "next/link";
import { PostCard } from "@/ui/posts/PostCard";

export default async function PostsPage() {
  const posts = await getPosts();
  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Posts</h1>
      <Link href="/posts/create" className="btn">New Post</Link>
      <ul className="space-y-4 mt-6">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </ul>
    </main>
  );
}
