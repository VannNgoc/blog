import { notFound } from "next/navigation";
import {getPostById} from "@/lib/posts/queries";
import {editPostHandler} from "@/lib/posts/actions";
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

  return (
  <main className="container mx-auto p-4 text-zinc-900 dark:text-zinc-50">
    <div className="container mx-auto p-4">
        <h1 className="mb-8 text-4xl font-medium tracking-medium text-zinc-800 dark:text-zinc-100">Edit Post</h1>
        <form action={editPostHandler}>
            <input name="id" type="hidden" value={postId} />
            <input name="title" type="text" placeholder="Post Title" className="mb-4 w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-blue-500" defaultValue={post.post_name} required/>
            <textarea name="body" placeholder="Post Content" className="mb-4 h-40 w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-blue-500" defaultValue={post.post_body} required></textarea>
            <button type="submit" className="btn" aria-label="Confirm Edits">Confirm</button>
            <Link className="btn-cancel ms-4" href="/posts">
              Cancel
            </Link>
          </form>
        </div>
      </main>);
}
