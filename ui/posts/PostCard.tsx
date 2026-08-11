import Link from "next/link";
import type { PostWithAuthorRow } from "@/type/post";
import { tiptapFirstBlockText } from "@/lib/tiptap-content";
import { ACCESS_DRAFT } from "@/lib/constants";
import { DeletePostConfirmButton } from "@/ui/posts/DeletePostConfirmationButton";
import { EditButton } from "@/ui/posts/EditButton";

type PostCardProps = {
  post: PostWithAuthorRow;
  isAuthor: boolean;
  /** Show a Public/Private badge next to the date. Only meaningful where the
      list can contain a mix of both (the signed-in dashboard) — the public
      feed is always public, so it stays off there by default. */
  showAccessBadge?: boolean;
};

export function PostCard({ post, isAuthor, showAccessBadge = false }: PostCardProps) {
  // Prefer the author's description; fall back to the post's opening block.
  const preview = post.post_description?.trim() || tiptapFirstBlockText(post.post_body_json);
  const isPrivate = post.access !== 1;
  const isDraft = post.access === ACCESS_DRAFT;
  // A draft has no reader-facing page (see app/posts/[id]/page.tsx), so the
  // card opens the editor instead — the only thing you can do with one.
  const href = isDraft ? `/posts/${post.id}/edit` : `/posts/${post.id}`;

  return (
    <li className={`relative rounded-lg border p-4 transition-all hover:border-l-zinc-800 hover:bg-zinc-50 dark:hover:border-l-zinc-400 dark:hover:bg-zinc-900 group ${isDraft ? "border-dashed border-zinc-300 border-l-4 border-l-zinc-300 dark:border-zinc-600 dark:border-l-zinc-600" : "border-zinc-200 border-l-4 border-l-zinc-200 dark:border-zinc-700 dark:border-l-zinc-700"}`}>
      <Link href={href} className="block">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">{post.post_name}</h2>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Author: {post.username}</p>

        <p className="my-3 text-sm line-clamp-3 text-zinc-800 dark:text-zinc-200">
          {preview}
        </p>

        <p className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>{new Date(post.post_date).toLocaleDateString()}</span>
          {showAccessBadge && (
            isPrivate ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                Private
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
                Public
              </span>
            )
          )}
        </p>
      </Link>
      <div className="flex absolute top-2 right-2 gap-2">
        {isAuthor && <DeletePostConfirmButton id={post.id} />}
        {isAuthor && <EditButton id={post.id} />}
      </div>
    </li>
  );
}
