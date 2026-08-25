import type { Metadata } from "next";
import { getPublicPostArchive } from "@/lib/posts/queries";
import { PostArchiveList } from "@/ui/posts/PostArchiveList";
import { NavTransition } from "@/ui/NavTransition";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archive",
  description: "Every shared post, by year.",
};

/**
 * The public index. Shares `PostArchiveList` with the dashboard, but without
 * access badges or row actions: every post here is public by definition, and a
 * visitor has nothing to edit.
 */
export default async function ArchivePage() {
  const posts = await getPublicPostArchive();

  return (
    <NavTransition>
      <main id="main-content" className="mx-auto w-full max-w-prose p-4 pb-24 md:pb-4">
        <div className="my-4">
          <h1 className="text-2xl font-semibold text-foreground">Archive</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {posts.length} {posts.length === 1 ? "post" : "posts"}, newest first.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="mt-8">
            <PostArchiveList posts={posts} />
          </div>
        )}
      </main>
    </NavTransition>
  );
}
