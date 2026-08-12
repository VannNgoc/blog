import type { MetadataRoute } from "next";
import { getPosts, getPostsCount } from "@/lib/posts/queries";
import { BASE_URL, PAGINATION_LIMIT } from "@/lib/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const count = await getPostsCount({ isPublic: true });
  const totalPages = Math.max(1, Math.ceil(count / PAGINATION_LIMIT));

  const pages = await Promise.all(
    Array.from({ length: totalPages }, (_, i) => getPosts(undefined, i + 1))
  );

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/posts`, changeFrequency: "daily", priority: 0.8 },
    ...pages.flat().map((post) => ({
      url: `${BASE_URL}/posts/${post.id}`,
      lastModified: post.post_edit_date ?? post.post_date,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
