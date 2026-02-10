import { notFound } from "next/navigation";
import { sql } from "@/lib/db";

type Post = {
  id: number;
  post_name: string;
  post_date: Date;
  post_body: string;
};

export default async function Page({
  params,
}: {
  params: { id: string };
}) {
  // "1" when user visits /posts/1
  const { id } = await params;
  const data = (await sql`
      SELECT id, post_name, post_date, post_body, post_tags
      FROM posts
      WHERE id = ${id}
    `) as Post[];
  const post = data[0];

  const postId = Number(id);
  if (Number.isNaN(postId)) notFound();

  return (
  <main className="container mx-auto p-4">
    <h1>Post ID: {id}</h1>
    <h2>Post Name: {post.post_name}</h2>
    <p>Post Body: {post.post_body}</p>
    <p>Post Date: {new Date(post.post_date).toLocaleDateString()}</p>
  </main>);
}
