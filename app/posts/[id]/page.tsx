import { notFound } from "next/navigation";
import { getAdjacentPosts, getPostById } from "@/lib/posts/queries";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import Link from "next/link";
import { auth } from '@/lib/auth/server'

export default async function Page({
  params,
}: {
  params: { id: string };
}) {
  // "1" when user visits /posts/1
  const {data: session} = await auth.getSession();
  const userID = session?.user.id || '';
  const { id } = await params;
  const postId = Number(id);
  if (Number.isNaN(postId)) notFound();
  const post = await getPostById(postId);
  if (!post) notFound();
  if (post.access !== 1 && post.post_author !== userID) notFound();
  const { newer, older } = await getAdjacentPosts({ id: post.id, post_date: post.post_date, user_id: userID });

  return (
  <main className="container mx-auto p-4 pb-24 text-zinc-900 md:pb-4 dark:text-zinc-50">
    <div className="text-center">
      <h2 className="text-4xl tracking-wider text-zinc-900 dark:text-zinc-50">{post.post_name}</h2>
      <p className="text-zinc-600 dark:text-zinc-400">{post.username}</p>
      <p className="text-zinc-600 dark:text-zinc-400">{new Date(post.post_date).toLocaleDateString()}</p>
    </div>
    <hr className="my-4 border-zinc-200 dark:border-zinc-700"/>

    <SimpleEditor key={post.id} editable={false} initialContent={post.post_body_json} />

    <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
      {/* Mobile: full-width nav cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {newer && (
          <Link href={`/posts/${newer.id}`} className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Next</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{newer.post_name}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="ml-3 size-5 shrink-0 text-zinc-400 dark:text-zinc-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}
        {older && (
          <Link href={`/posts/${older.id}`} className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-3 size-5 shrink-0 text-zinc-400 dark:text-zinc-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <div className="text-right">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Previous</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{older.post_name}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Desktop: simple inline links */}
      <div className="hidden sm:flex sm:items-center sm:justify-between">
        {older ? (
          <Link className="inline-flex items-center gap-1.5 text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100" href={`/posts/${older.id}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span>{older.post_name}</span>
          </Link>
        ) : <span />}
        {newer ? (
          <Link className="inline-flex items-center gap-1.5 text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100" href={`/posts/${newer.id}`}>
            <span>{newer.post_name}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ) : <span />}
      </div>
    </div>

  </main>);
}
