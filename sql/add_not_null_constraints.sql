-- Make POSTS.access and POSTS.post_author NOT NULL.
--
-- Both already have foreign keys, so the data was consistent — but nothing
-- stopped a NULL being written. That matters more than it looks: every listing
-- query filters on `access` with an equality or inequality test, and in SQL
-- `NULL != 4` evaluates to NULL, not true. A row with a null access level would
-- silently disappear from every query, including its own author's dashboard,
-- with no error raised anywhere.
--
-- Reverse with:
--   ALTER TABLE "POSTS" ALTER COLUMN access DROP NOT NULL;
--   ALTER TABLE "POSTS" ALTER COLUMN post_author DROP NOT NULL;

ALTER TABLE "POSTS" ALTER COLUMN access SET NOT NULL;
ALTER TABLE "POSTS" ALTER COLUMN post_author SET NOT NULL;
