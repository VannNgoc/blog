import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from '@/lib/auth/session';
import { getUserPostCounts } from "@/lib/posts/queries";

// Server components using auth methods must be rendered dynamically
export const dynamic = 'force-dynamic';

const linkClass =
  "text-foreground underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted-foreground";

export default async function AccountPage() {
  const { data: session } = await getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const counts = await getUserPostCounts(session.user.id);
  const joined = new Date(session.user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main id="main-content" className="mx-auto w-full max-w-prose p-4 pb-24 md:pb-4">
      <h1 className="my-4 text-2xl font-semibold text-foreground">{session.user.name}</h1>
      <p className="text-sm text-muted-foreground">
        {session.user.email} · Writing here since {joined}
      </p>

      <p className="mt-6 text-foreground">
        {counts.published} published · {counts.private} private · {counts.drafts}{" "}
        {counts.drafts === 1 ? "draft" : "drafts"}
      </p>

      <section aria-labelledby="your-writing" className="mt-8">
        <h2 id="your-writing" className="text-lg font-semibold text-foreground">
          Your writing
        </h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm">
          <li>
            {/* A plain anchor, not <Link>: this is a file download, not a page
                for the client router to fetch and render. */}
            <a href="/api/export" download className={linkClass}>
              Download all my posts
            </a>
            <p className="mt-1 text-muted-foreground">
              One JSON file with every post, draft and private entry, in the format they&apos;re
              stored in. Images are listed by name, not included.
            </p>
          </li>
          <li>
            <Link href="/trash" className={linkClass}>
              Trash
            </Link>
            <p className="mt-1 text-muted-foreground">Restore posts you&apos;ve deleted.</p>
          </li>
        </ul>
      </section>
    </main>
  );
}
