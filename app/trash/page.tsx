import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserTrashedPosts } from "@/lib/posts/queries";
import { ACCESS_DRAFT, ACCESS_PUBLIC, TRASH_RETENTION_DAYS } from "@/lib/constants";
import { RestorePostButton } from "@/ui/posts/RestorePostButton";
import { DeletePostConfirmButton } from "@/ui/posts/DeletePostConfirmationButton";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

const ACCESS_LABEL: Record<number, string> = {
  [ACCESS_PUBLIC]: "Public",
  [ACCESS_DRAFT]: "Draft",
};

function formatDay(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Deleted posts, waiting out TRASH_RETENTION_DAYS before the nightly cron
 * removes them for good.
 *
 * Titles aren't links: a trashed post has no page (getPostById skips it), so
 * the only things to do here are bring it back or finish deleting it.
 */
export default async function Trash() {
  const { data: session } = await getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const posts = await getUserTrashedPosts(session.user.id);

  return (
    <main id="main-content" className="mx-auto w-full max-w-prose p-4 pb-24 md:pb-4">
      <h1 className="my-4 text-2xl font-semibold text-foreground">Trash</h1>
      <p className="text-sm text-muted-foreground">
        Deleted posts stay here for {TRASH_RETENTION_DAYS} days, then they and their images are
        removed for good.
      </p>

      {posts.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">The trash is empty.</p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-700">
          {posts.map((post) => {
            const trashedAt = new Date(post.deleted_at);
            const purgeOn = new Date(trashedAt.getTime() + TRASH_RETENTION_DAYS * DAY_MS);
            return (
              <li key={post.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-foreground">{post.post_name.trim()}</p>
                  <p className="text-xs text-faint-foreground">
                    {ACCESS_LABEL[post.access] ?? "Private"} · Deleted {formatDay(trashedAt)} · Gone
                    for good after {formatDay(purgeOn)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <RestorePostButton id={post.id} />
                  <DeletePostConfirmButton id={post.id} label="Delete forever" permanent />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
