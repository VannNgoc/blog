export type PostRow = {
  id: number;
  post_name: string;
  post_author: string;
  post_date: Date;
  post_edit_date: Date;
  post_body: string;
};

export type NewPostInput = {
  post_name: string;
  post_author: string;
  post_body: string;
  post_date: string;
};

export type EditPostInput = {
  id: number;
  post_name: string;
  post_body: string;
  post_edit_date: string;
};