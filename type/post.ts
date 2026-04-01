export type PostRow = {
  id: number;
  post_name: string;
  post_author: number;
  post_date: Date;
  post_edit_date: Date;
  post_body: string;
};

/** Row from getPostById: POSTS joined with USERS for author display name */
export type PostWithAuthorRow = PostRow & {
  display_name: string;
};

export type NewPostInput = {
  post_name: string;
  post_author: number;
  post_body: string;
  post_date: string;
};

export type EditPostInput = {
  id: number;
  post_name: string;
  post_body: string;
  post_edit_date: string;
};