# recollections

A personal blog and reflection journal I built while between jobs — partly to document that time, partly to keep my engineering skills sharp, and partly because writing things down is the best way I know to make sense of them.

Posts can be **public** (shared on the blog) or **private** (visible only to the author), so the same app works as both a public blog and a personal journal.

<!-- screenshot: posts list -->
<!-- screenshot: post detail page -->

**Live site:** _coming soon_ <!-- add your deployment URL here -->

## Features

- **Email/password auth** via Neon Auth, with session-aware server components
- **Post CRUD** — create, edit, and delete posts, with author-only authorization enforced server-side
- **Public/private access levels** — private posts are filtered out of listings and fail closed on direct URL access
- **Pagination** on both the public feed and the personal dashboard
- **Previous/next post navigation** ordered by post date
- **Form validation** shared between client and server with Zod schemas and React Hook Form
- **Dark mode** styling throughout with Tailwind CSS
- **Unit and component tests** with Jest and React Testing Library

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, React Server Components, Server Actions) |
| UI | React 19, Tailwind CSS 4, Heroicons |
| Database | [Neon](https://neon.tech) serverless Postgres, queried with tagged-template SQL |
| Auth | Neon Auth (`@neondatabase/auth`) |
| Validation | Zod 4 + React Hook Form |
| Testing | Jest 30, React Testing Library |
| Hosting | Vercel, with Analytics and Speed Insights |

## Architecture notes

A few decisions I made deliberately:

- **Server-first data access.** All queries and mutations live in `lib/` and are marked `server-only`, so database code can never leak into a client bundle. Pages are async server components that fetch directly.
- **Server Actions over API routes.** Mutations (`lib/posts/actions.ts`) are Server Actions that validate input with Zod, check the session, verify authorship, and then call the data layer — keeping authorization next to the mutation it protects.
- **Authorization at every entry point.** Listing queries filter by access level in SQL; the post detail and edit pages re-check access/authorship server-side, so private posts aren't reachable by URL guessing.
- **Plain SQL over an ORM.** Queries use Neon's tagged-template driver directly. For an app this size I wanted to stay close to the SQL rather than learn an ORM's abstraction over it.

## Project structure

```
app/          Routes (App Router): posts feed, post detail, create/edit, auth, dashboard
ui/           Presentational components (PostCard, forms, header, ...)
lib/          Data layer: SQL queries, server actions, auth helpers, db client
schemas/      Zod schemas shared by forms and server actions
type/         TypeScript row/input types for posts
__tests__/    Jest unit and component tests
```

## Running locally

You'll need Node 20+ and a [Neon](https://neon.tech) project with Neon Auth enabled.

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file with your Neon credentials (the connection string and Neon Auth keys from the Neon console):

   ```bash
   DATABASE_URL=...
   NEXT_PUBLIC_STACK_PROJECT_ID=...
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
   STACK_SECRET_SERVER_KEY=...
   NEON_AUTH_BASE_URL=...
   NEON_AUTH_COOKIE_SECRET=...
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Then open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test              # run the suite once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

## Roadmap

- Rich text editing (Tiptap) — in progress
- Tags and full-text search across posts
- Public homepage surfacing recent posts
- Calendar/streak view for reflection
