export type PostRow = {
  id: number;
  post_name: string;
  post_author: string;
  post_date: Date;
  post_body: string;
};

export type CreatePostInput = {
  post_name: string;
  post_author: string;
  content: string;
};