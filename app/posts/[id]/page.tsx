import { notFound } from "next/navigation";
import { getAdjacentPosts, getPostById } from "@/lib/posts/queries";
import Link from "next/link";

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
  if (!post) notFound();
  const { newer, older } = await getAdjacentPosts({ id: post.id, post_date: post.post_date });

  return (
  <main className="container mx-auto p-4 text-center">
    <h2 className="text-4xl tracking-wider">{post.post_name}</h2>
    <p className="text-gray-600">{post.display_name}</p>
    <p className="text-gray-600">{new Date(post.post_date).toLocaleDateString()}</p>
    <hr className="my-4"/>
    <p className="mbs-4">{post.post_body}</p>

    <div className="mt-6 flex items-center justify-between">
      {older ? (
        <Link className="inline-flex items-center gap-2 hover:underline" href={`/posts/${older.id}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span>{older.post_name}</span>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span></span>
        </span>
      )}

      {newer ? (
        <Link className="inline-flex items-center gap-2 hover:underline" href={`/posts/${newer.id}`}>
          <span>{newer.post_name}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-2 text-gray-400">
          <span></span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </span>
      )}
    </div>

  </main>);
}
