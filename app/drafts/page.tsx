import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserDrafts, getUserDraftsCount } from "@/lib/posts/queries";
import { PostCard } from "@/ui/posts/PostCard";
import { PostListSkeleton } from "@/ui/posts/PostListSkeleton";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import { PostsNavBar } from "@/ui/posts/PostsNavBar";
import { auth } from '@/lib/auth/server';
export const dynamic = 'force-dynamic';

async function DraftsList({ userId, page }: { userId: string; page: number }) {
  const drafts = await getUserDrafts(userId, page);

  if (drafts.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        You haven&apos;t started any drafts yet.
      </p>
    );
  }

  return (
    <ul className="space-y-4 mt-6">
      {drafts.map((p) => (
        <PostCard key={p.id} post={p} isAuthor />
      ))}
    </ul>
  );
}

export default async function Drafts({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const draftsCount = await getUserDraftsCount(session.user.id);

  return (
    <main id="main-content" className="container mx-auto p-4">
      <div className="my-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Drafts</h1>
        <CreatePostButton/>
      </div>
      <Suspense key={page} fallback={<PostListSkeleton />}>
        <DraftsList userId={session.user.id} page={page} />
      </Suspense>
      <PostsNavBar numberPosts={Number(draftsCount)}/>
    </main>
  );
}
