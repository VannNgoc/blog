import { sql } from "@/lib/db";
import type { PostRow } from "@/type/post";

export default async function GetPosts() {
  const posts = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM posts
    ORDER BY post_date DESC, id DESC
  `) as PostRow[];
    return posts;
}