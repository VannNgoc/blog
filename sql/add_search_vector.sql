-- Full-text search for POSTS.
--
-- Reconstructed from the live database so a fresh clone can actually reach a
-- working search — the README referenced this file for a while before it
-- existed, which meant step 3 of the setup instructions silently did nothing.
--
-- The column is maintained by a trigger rather than computed at query time:
-- matching becomes an indexed GIN lookup instead of re-parsing every post's
-- body on every keystroke.

ALTER TABLE "POSTS" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Titles are weighted 'A' and body text 'B', so a term in the title outranks
-- the same term buried in a paragraph. The body is Tiptap JSON, so the text has
-- to be pulled out of the document tree: `$.**.text` collects every text node at
-- any depth, which keeps headings, list items and blockquotes searchable
-- without needing to know the schema.
CREATE OR REPLACE FUNCTION posts_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.post_name, '')), 'A') ||
    setweight(
      to_tsvector('english', coalesce((
        SELECT string_agg(elem, ' ')
        FROM jsonb_array_elements_text(
          jsonb_path_query_array(NEW.post_body_json, '$.**.text')
        ) AS elem
      ), '')),
      'B'
    );
  RETURN NEW;
END
$$;

-- Scoped to the two columns that feed the vector: an access-level change or a
-- date edit shouldn't pay to re-tokenise the whole body.
DROP TRIGGER IF EXISTS posts_search_vector_trigger ON "POSTS";
CREATE TRIGGER posts_search_vector_trigger
  BEFORE INSERT OR UPDATE OF post_name, post_body_json
  ON "POSTS"
  FOR EACH ROW
  EXECUTE FUNCTION posts_search_vector_update();

CREATE INDEX IF NOT EXISTS posts_search_vector_idx
  ON "POSTS" USING gin (search_vector);

-- Backfill existing rows. The trigger only fires on write, so without this any
-- post created before the migration stays unsearchable.
UPDATE "POSTS" SET post_name = post_name;
