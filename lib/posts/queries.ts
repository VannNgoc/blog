import "server-only";
import { sql } from "@/lib/db";
import type { PostRow } from "@/type/post";

export async function getPosts() {
  const posts = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM posts
    ORDER BY post_date DESC, id DESC
  `) as PostRow[];
  return posts;
}

export async function getPostById(id: number) {
  const post = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM posts
    WHERE id = ${id}
  `) as PostRow[];
  return post[0];
}