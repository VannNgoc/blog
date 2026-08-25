export const PAGINATION_LIMIT = 10;

/** POSTS.access values. These are foreign keys onto the ACCESS_TYPES table, so
    adding one here means adding the matching lookup row (see sql/). */
export const ACCESS_PUBLIC = 1;
export const ACCESS_PRIVATE = 2;
export const ACCESS_DRAFT = 4;

/** Vercel sets this to the production domain (no protocol) on every deploy. */
export const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

/** Image types a post body may embed.
 *
 *  This is an allowlist, not a blocklist, and it is enforced twice on purpose:
 *  once at upload so nothing else is ever stored, and again when serving so a
 *  blob predating this rule can't be handed back with an executable type.
 *  The browser declares `file.type`, so it is attacker-controlled — the value
 *  is only ever compared against this set, never trusted as-is.
 *
 *  SVG is deliberately absent: it is an XML document that can carry <script>,
 *  so serving one same-origin is script execution, not an image. */
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

/** Cap on a single upload. Nothing bounded size before, so the 30-uploads-per-
 *  10-minutes rate limit still permitted 30 arbitrarily large files. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
