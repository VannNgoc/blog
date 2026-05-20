import { notFound } from "next/navigation";
import { getPostById } from "@/lib/posts/queries";
import EditPostForm from "@/ui/posts/EditPostForm";

export default async function Page({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const postId = Number(id);
  if (Number.isNaN(postId)) notFound();
  const post = await getPostById(postId);
  if (!post) notFound();

  return (
    <main className="container mx-auto p-4 text-zinc-900 dark:text-zinc-50">
      <EditPostForm post={post} />
    </main>
  );
}
