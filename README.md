# recollections

A personal blog and reflection journal. Posts are **public**, **private**, or **drafts**, so the same app is both a public blog and a private journal — which is what makes the access model the interesting part rather than an afterthought.

**Live:** [vann-recollections.vercel.app](https://vann-recollections.vercel.app/) · Next.js 16 · React 19 · Neon Postgres · ~5,100 lines of application code · 293 tests

![Posts feed](docs/screenshots/posts-list.png)

---

## What's actually interesting here

Five decisions worth a look, each with the trade-off it cost.

### 1. Access control is enforced in four places, not one

A private post has to stay private through every door into it. So the check is repeated where the data is, rather than trusted once:

- **Listing queries** filter by access level in SQL, so a private row never enters a result set.
- **The post page** re-checks server-side, so URL guessing gets a 404 rather than a render.
- **`generateMetadata`** mirrors the same checks — otherwise a private post leaks its title and description into `<head>` even when the body is hidden.
- **`/api/file`** re-checks per image, and requires that the post *actually embeds that pathname* — not merely that you paired a real `postId` with some blob key.

That last condition is the one that's easy to miss. Without it, any public post's id unlocks any file in storage.

**Trade-off:** four places to keep in sync. `__tests__/file-route.test.ts` pins all of them, including the pairing attack.

### 2. The editor's JS never reaches a reader

Posts are stored as Tiptap JSON. The obvious way to display them is to mount the editor read-only — and that ships the entire editor to everyone who reads a post.

Instead the read path renders through `@tiptap/static-renderer` on the server, so a reader gets HTML. Verified rather than assumed: fingerprinting the chunks a post page loads finds **zero** ProseMirror or Tiptap code.

**Trade-off:** two schema definitions that must agree. A comment in `post-schema-extensions.ts` used to claim editor-only nodes could never reach a saved document. That was wrong — an abandoned image-upload placeholder persisted into a post and crashed the reader page, since the read-only schema has no extension for it. `stripEditorOnlyNodes` now removes them on both write and read, and `__tests__/post191.regression.test.tsx` runs against that post's real stored body.

### 3. Removing a loading skeleton improved LCP by 861ms

A root `app/loading.tsx` wraps *every* route in a Suspense boundary: the server flushes a skeleton, and the real content arrives as a second chunk React swaps in.

Measured on `/posts/[id]`, Lighthouse mobile, five runs per arm, non-overlapping distributions:

| | With skeleton | Without |
|---|---|---|
| LCP | 3223ms | **2362ms** |
| FCP | 1057ms | **909ms** |
| TTFB | ~0.30s | 0.47s |

The skeleton didn't even paint sooner — FCP was 148ms *later* with it, because the extra render and DOM swap buy nothing on a cold load. Trading 150ms of TTFB (a metric with 800ms of headroom) for the two that were actually failing is a good deal.

**Trade-off:** routes that genuinely benefit from streaming declare their own scoped `<Suspense>` — see `app/dashboard`, where a skeleton after a filter change is real feedback.

**What this taught me:** a single Lighthouse run on this page resolves nothing under ~1s. An earlier 3-run comparison told me the opposite, and a port collision once had two "arms" unknowingly measuring the same server. Medians across five runs with a verified build in each, or don't bother.

### 4. Search is a Postgres index, not a scan

A trigger-maintained `tsvector` with a GIN index (`sql/add_search_vector.sql`), titles weighted above body text. The body is Tiptap JSON, so the trigger walks the document with `jsonb_path_query_array(..., '$.**.text')` to collect text at any depth — headings and list items stay searchable without hard-coding the schema.

On the public feed a term also matches the author's name, via substring `ILIKE` rather than a second `tsquery`: names aren't English words, so stemming mangles them and whole-lexeme matching misses the partial name someone types into a debounced box.

**Trade-off:** that half of the `OR` gives up the index. Correct at this size — folding usernames into the vector would mean re-syncing every one of an author's posts on rename.

### 5. Filter state lives in the URL

Search, pagination, and the dashboard's access/month filters are all query parameters. One data-fetching path, filtered views survive a refresh and can be linked, and the dashboard's stat cards and chart bars are plain `<Link>`s — **no client JavaScript for any of the filtering.**

**Trade-off:** every filter change is a server round trip. Mitigated with `useTransition` on the search box, which surfaces a pending state ~541ms in rather than leaving the input silent.

---

## Measured, not claimed

| | |
|---|---|
| Lighthouse accessibility | **100** on `/`, `/posts`, `/posts/[id]`, `/archive` |
| Lighthouse SEO | **100** on the same routes |
| Tests | **293** across 30 suites |
| API route coverage | **100%** statements (`/api/file`, `/api/upload`) |
| Text contrast | 14.2:1 primary, 7.8:1 secondary — both AAA |
| Reading measure | 60 characters at desktop width |

Contrast is deliberately *below* maximum. Near-black on white sits around 18:1, which overstimulates in light mode and causes halation in dark mode — glyphs appearing to bleed, worst for readers with astigmatism. 14:1 still clears AAA while stepping back from the extreme.

---

## Features

**Writing** — Tiptap rich text with inline image uploads; drafts; public/private/draft access levels; unsaved-changes guard covering three exit paths, including Sign Out (which destroys the session before navigating, so `beforeunload` is too late to save anything).

**Reading** — paginated feed, full-text search, chronological archive grouped by month, prev/next navigation with keyboard shortcuts, view transitions between posts.

**Managing** — a dashboard with published/private/draft counts, a twelve-month writing-cadence chart, and filtering by access level or any combination of months.

**Platform** — email/password auth, per-request CSP nonce, security headers, upload rate limiting, and a nightly cron that deletes blob images no longer referenced by any post.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions) |
| UI | React 19, Tailwind 4, Radix UI (editor menus) |
| Database | Neon serverless Postgres, tagged-template SQL — no ORM |
| Search | Postgres FTS (`tsvector` + GIN, trigger-maintained) |
| Storage | Vercel Blob, served through an access-checked route |
| Auth | Neon Auth |
| Validation | Zod 4, checked server-side inside Server Actions |
| Testing | Jest 30, React Testing Library |

No ORM was deliberate: at this size I wanted to stay close to the SQL rather than learn an abstraction over it. The cost is hand-written types in `type/post.ts` that the database doesn't enforce.

---

## Running locally

Node 20+ and a [Neon](https://neon.tech) project with Neon Auth enabled.

```bash
npm install
```

Create `.env.local`:

```bash
DATABASE_URL=...
NEON_AUTH_BASE_URL=...
NEON_AUTH_COOKIE_SECRET=...
BLOB_READ_WRITE_TOKEN=...
CRON_SECRET=...            # any random string; authorizes /api/cron/cleanup-blobs
```

Run the migrations in `sql/` against your database, in order — `add_search_vector.sql` first (search returns nothing without it), then `add_not_null_constraints.sql`.

```bash
npm run dev
npm test
```

---

## Known limitations

Things I'd fix next, listed because a project with no known problems usually means nobody looked.

- **Images ship at capture resolution.** 3252 × 4336 originals — file sizes are fine (129–192 KB), the *dimensions* are not: a phone allocates a ~56 MB bitmap to decode one. Resizing at upload is the largest remaining performance win, deferred because it needs a backfill decision on existing posts.
- **No index on the columns actually filtered.** `POSTS` has a primary key and the search GIN index; the dashboard filters on `post_author` and the feed on `access`, both sequential scans. Irrelevant at 60 rows, wrong before it's 6,000.
- **Rate limiting is per-instance.** An in-memory `Map`, so it resets on cold start and isn't shared between serverless instances. Real protection needs Vercel's Firewall rules.
- **`hooks/` is 20% covered.** The two that guard unsaved work are tested; `useMenuNavigation` isn't, because it's coupled to a live editor instance and needs scaffolding the others didn't.
- **Vestigial schema.** A `COMMENTS` table with one row and no feature behind it, and two legacy columns superseded by `post_body_json`.
- **Multi-author affordances the site doesn't use.** Author bylines and author-name search were built for a communal feed; in practice one person has written 60 of the 61 posts.
