import { notFound } from "next/navigation";
import { getOwnPostForEditing } from "@/lib/posts/editing";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { getSession } from "@/lib/auth/session";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: session } = await getSession();
  const post = await getOwnPostForEditing(Number(id), session?.user.id);
  if (!post) notFound();

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
