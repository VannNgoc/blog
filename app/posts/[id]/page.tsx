import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getAdjacentPosts, getPostById } from "@/lib/posts/queries";
import { PostContent } from "@/components/tiptap-templates/simple/post-content";
import { PostKeyboardNav } from "@/ui/posts/PostKeyboardNav";
import Link from "next/link";
import { auth } from '@/lib/auth/server'
import { withPostImageUrls } from '@/lib/tiptap-utils'
import { ACCESS_DRAFT, ACCESS_PUBLIC } from '@/lib/constants'
import { NavTransition } from '@/ui/NavTransition'

// De-duped per request (React's cache()) so generateMetadata and the page
// body share one DB round trip instead of each fetching the post separately.
const getCachedPost = cache((postId: number) => getPostById(postId));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const postId = Number(id);
  if (Number.isNaN(postId)) return {};

  const [{ data: session }, post] = await Promise.all([
    auth.getSession(),
    getCachedPost(postId),
  ]);
  // Mirror the page's own access checks — a draft or a private post someone
  // else authored must not leak its title/description into <head>.
  if (!post || post.access === ACCESS_DRAFT) return {};
  if (post.access !== ACCESS_PUBLIC && post.post_author !== (session?.user.id ?? '')) return {};

  const description = post.post_description || undefined;
  return {
    title: post.post_name,
    description,
    openGraph: {
      title: post.post_name,
      description,
      type: "article",
      publishedTime: new Date(post.post_date).toISOString(),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // "1" when user visits /posts/1
  const { id } = await params;
  const postId = Number(id);
  if (Number.isNaN(postId)) notFound();

  // Neither of these depends on the other's result, so run them concurrently
  // instead of paying two sequential network round trips.
  const [{ data: session }, post] = await Promise.all([
    auth.getSession(),
    getCachedPost(postId),
  ]);
  const userID = session?.user.id || '';
  if (!post) notFound();
  // A draft has no reader-facing page at all — not even for its author. It only
  // becomes a post once it's saved as public or private; until then the editor
  // (/posts/[id]/edit) is the only way in.
  if (post.access === ACCESS_DRAFT) notFound();
  if (post.access !== 1 && post.post_author !== userID) notFound();
  const { newer, older } = await getAdjacentPosts({ id: post.id, post_date: post.post_date, user_id: userID });

  return (
  <NavTransition>
  <main id="main-content" className="mx-auto w-full max-w-prose p-4 pb-24 text-foreground md:pb-4">
    <PostKeyboardNav
      key={`keyboard-nav-${post.id}`}
      nextHref={newer ? `/posts/${newer.id}` : undefined}
      previousHref={older ? `/posts/${older.id}` : undefined}
    />
    <div className="text-center">
      {/* The post's own title is this page's h1. It was an h2, which left the
          most-shared and most-indexed page type on the site with no top-level
          heading at all — every other route has one. Lighthouse doesn't catch
          it, because `heading-order` only flags *skipped* levels, not a
          missing h1. Styling is unchanged; only the semantics move. */}
      <h1 className="text-4xl mt-2 tracking-wider text-foreground">{post.post_name}</h1>
      <p className="text-muted-foreground">{post.username}</p>
      <p className="text-muted-foreground">{new Date(post.post_date).toLocaleDateString()}</p>
    </div>
    <hr className="my-4 border-zinc-200 dark:border-zinc-700"/>

    <PostContent key={post.id} content={withPostImageUrls(post.post_body_json, post.id)} />

    <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
      {/* Mobile: full-width nav cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {older && (
          <Link href={`/posts/${older.id}`} transitionTypes={['nav-back']} className="flex items-center rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-3 size-5 shrink-0 text-faint-foreground">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint-foreground">Previous</p>
              <p className="text-sm font-medium text-foreground">{older.post_name}</p>
            </div>
          </Link>
        )}
        {newer && (
          <Link href={`/posts/${newer.id}`} transitionTypes={['nav-forward']} className="flex items-center justify-end rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            <div className="text-right">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint-foreground">Next</p>
              <p className="text-sm font-medium text-foreground">{newer.post_name}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="ml-3 size-5 shrink-0 text-faint-foreground">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}
      </div>

      {/* Desktop: simple inline links */}
      <div className="hidden sm:flex sm:items-center sm:justify-between">
        {older ? (
          <Link className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline" href={`/posts/${older.id}`} transitionTypes={['nav-back']} aria-keyshortcuts="ArrowLeft">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span>{older.post_name}</span>
            <kbd className="rounded border border-zinc-300 px-1 text-[10px] text-faint-foreground dark:border-zinc-600" aria-hidden="true">←</kbd>
          </Link>
        ) : <span />}
        {newer ? (
          <Link className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline" href={`/posts/${newer.id}`} transitionTypes={['nav-forward']} aria-keyshortcuts="ArrowRight">
            <kbd className="rounded border border-zinc-300 px-1 text-[10px] text-faint-foreground dark:border-zinc-600" aria-hidden="true">→</kbd>
            <span>{newer.post_name}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ) : <span />}
      </div>
    </div>

  </main>
  </NavTransition>);
}
