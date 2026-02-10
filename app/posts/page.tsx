// app/posts/page.tsx
import { sql } from "@/lib/db";
import type { PostRow } from "@/type/post";
import Link from "next/link";

export default async function PostsPage() {
  const posts = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM posts
    ORDER BY post_date DESC, id DESC
  `) as PostRow[];

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6">Posts</h1>
      <ul className="space-y-4">
        {posts.map((p) => (
            <Link href={`posts/${p.id}`} className="block" key={p.id}>
                <li key={p.id} className="rounded-lg border p-4 ">
                    <h2 className="text-lg font-medium">{p.post_name}</h2>
                    <p className="text-sm text-gray-600">
                    {new Date(p.post_date).toLocaleDateString()}
                    </p>
                    <p className="mt-3 text-sm">{p.post_body}</p>
                </li>
            </Link>
        ))}
      </ul>
    </main>
  );
}
