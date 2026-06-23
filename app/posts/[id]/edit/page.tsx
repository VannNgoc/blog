import { notFound } from "next/navigation";
import { getPostById } from "@/lib/posts/queries";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { auth } from "@/lib/auth/server";

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
  const { data: session } = await auth.getSession();
  if (session?.user.id !== post.post_author) {
    notFound();
  }

  return (
    <SimpleEditor
      postId={post.id}
      initialContent={post.post_body_json}
      initialTitle={post.post_name}
      initialDescription={post.post_description ?? ""}
      initialAccess={post.access}
    />
  );
}
