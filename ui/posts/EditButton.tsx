import Link from "next/link";

type EditButtonProps = {
  id: number;
};

export function EditButton({ id }: EditButtonProps) {
  return (
    <Link
      href={`/posts/${id}/edit`}
      className="ml-2 text-sm text-blue-600 hover:underline"
    >
      Edit
    </Link>
  );
}