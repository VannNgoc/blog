import { notFound } from "next/navigation";
import {getPostById} from "@/lib/posts/queries";

export default async function Page({
  params,
}: {
  params: { id: string };
}) {
  // "1" when user visits /posts/1
  const { id } = await params;
  const postId = Number(id);
  if (Number.isNaN(postId)) notFound();
  const post = await getPostById(postId);

  return (
  <main className="container mx-auto p-4">
    <h1>Post ID: {id}</h1>
    <h2>Post Name: {post.post_name}</h2>
    <p>Post Body: {post.post_body}</p>
    <p>Post Date: {new Date(post.post_date).toLocaleDateString()}</p>
  </main>);
}
