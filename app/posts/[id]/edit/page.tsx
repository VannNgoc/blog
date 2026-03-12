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
  <main className="container mx-auto p-4">
    <div className="container mx-auto p-4">
        <h1 className="mb-8 text-4xl font-medium tracking-medium text-zinc-800 dark:text-zinc-200">Edit Post</h1>
        <form action={editPostHandler}>
            <input name="id" type="hidden" value={postId} />
            <input name="title" type="text" placeholder="$Post Title" className="border p-2 w-full mb-4" defaultValue={post.post_name}/>
            <textarea name="body" placeholder="Post Content" className="border p-2 w-full h-40 mb-4" defaultValue={post.post_body}></textarea>
            <button type="submit" className="btn" aria-label="Confirm Edits">Confirm</button>
            <Link className="btn-cancel ms-4" href="/posts">
              Cancel
            </Link>
          </form>
        </div>
      </main>);
}
