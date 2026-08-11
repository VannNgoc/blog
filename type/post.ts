import type { JSONContent } from "@tiptap/core";

/** Row from the POSTS table; body is stored as Tiptap JSON, not a string. */
export type PostRow = {
  id: number;
  post_name: string;
  post_author: string;
  post_date: Date;
  post_edit_date: Date | null;
  post_body_json: JSONContent;
  post_description: string | null;
  /** FK onto ACCESS_TYPES: 1 = public, 2 = private, 3 = followers, 4 = draft. */
  access: number;
};

/** POSTS joined with USERS for author display name. */
export type PostWithAuthorRow = PostRow & {
  username: string;
};

export type NewPostInput = {
  post_name: string;
  post_author: string;
  post_body: JSONContent;
  post_description: string;
  post_date: string;
  access_type: number;
};

export type EditPostInput = {
  id: number;
  post_name: string;
  post_body: JSONContent;
  post_description: string;
  post_edit_date: string;
  access_type: number;
};
