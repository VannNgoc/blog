import "server-only";
import { sql } from "@/lib/db";
import type { EditPostInput, PostRow } from "@/type/post";
import type { NewPostInput } from "@/type/post";

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

export async function createPost(postData: NewPostInput) {
  const { post_name, post_author, post_body, post_date } = postData;
  await sql`
    INSERT INTO posts (post_name, post_author, post_body, post_date)
    VALUES (${post_name}, ${post_author}, ${post_body}, ${post_date})
  `;
  return "Post created successfully";
}

export async function editPost(postData: EditPostInput) {
  const { id, post_name, post_body, post_edit_date } = postData;
  await sql`
    UPDATE posts
    SET post_name = ${post_name}, post_body = ${post_body}, post_edit_date = ${post_edit_date}
    WHERE id = ${id}
  `;
  return "Post edited successfully";
}

export async function deletePostById(id: number) {
  const result = await sql`
    DELETE FROM posts
    WHERE id = ${id}
    RETURNING *;
  `;
  return result[0] ?? null;
}