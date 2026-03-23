import "server-only";
import { sql } from "@/lib/db";
import type { PostRow } from "@/type/post";

export async function getPosts() {
  const posts = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM "POSTS"
    ORDER BY post_date DESC, id DESC
  `) as PostRow[];
  return posts;
}

export async function getPostById(id: number) {
  const post = (await sql`
    SELECT *
    FROM "POSTS"
    WHERE id = ${id}
  `) as PostRow[];
  return post[0];
}

export async function getAdjacentPosts(input: { id: number; post_date: Date }) {
  const newer = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM "POSTS"
    WHERE (
      post_date > ${input.post_date}
      OR (post_date = ${input.post_date} AND id > ${input.id})
    )
    ORDER BY post_date ASC, id ASC
    LIMIT 1
  `) as PostRow[];

  const older = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM "POSTS"
    WHERE (
      post_date < ${input.post_date}
      OR (post_date = ${input.post_date} AND id < ${input.id})
    )
    ORDER BY post_date DESC, id DESC
    LIMIT 1
  `) as PostRow[];

  return { newer: newer[0], older: older[0] };
}