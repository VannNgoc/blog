import {deletePostById} from "@/lib/posts/queries";
type DeletePostIconProps = {
  id: number;
};

export function DeletePostIcon({ id }: DeletePostIconProps) {
  return <div><button onClick={() => deletePostById(id)}>Delete Post</button></div>;
}