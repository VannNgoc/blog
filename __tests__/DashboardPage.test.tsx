jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

jest.mock("@/lib/auth/server", () => ({
  auth: { getSession: jest.fn() },
}));

jest.mock("@/lib/posts/queries", () => ({
  getUserPostArchive: jest.fn(),
  getUserPostCadence: jest.fn(),
  getUserPostCounts: jest.fn(),
}));

jest.mock("@/ui/posts/DeletePostConfirmationButton", () => ({
  DeletePostConfirmButton: ({ id }: { id: number }) => (
    <button data-testid="delete-btn" data-id={id}>Delete</button>
  ),
}));
jest.mock("@/ui/posts/EditButton", () => ({
  EditButton: ({ id }: { id: number }) => (
    <a data-testid="edit-btn" href={`/posts/${id}/edit`}>Edit</a>
  ),
}));
jest.mock("@/ui/posts/createPostButton", () => ({
  // A button rather than an anchor: the lint rule that wants next/link for
  // internal hrefs fires on test stubs too, and the stub only needs to exist.
  CreatePostButton: () => <button type="button">New post</button>,
}));
jest.mock("@/ui/posts/Search", () => ({
  Search: () => <input aria-label="Search posts" />,
}));

jest.mock("next/link", () => {
  // Forwards every prop, not just href/children: aria-label and aria-current
  // are the whole point of several assertions below, and a mock that drops them
  // would let those pass against markup that never shipped them.
  function MockLink({ href, children, scroll, ...rest }: React.ComponentProps<"a"> & { scroll?: boolean }) {
    void scroll;
    return <a href={String(href)} {...rest}>{children}</a>;
  }
  return MockLink;
});

import { render, screen, within } from "@testing-library/react";
import Dashboard, { DashboardArchive } from "@/app/dashboard/page";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import {
  getUserPostArchive,
  getUserPostCadence,
  getUserPostCounts,
} from "@/lib/posts/queries";
import { ACCESS_PRIVATE, ACCESS_PUBLIC } from "@/lib/constants";

const mockGetSession = auth.getSession as jest.Mock;
const mockArchive = getUserPostArchive as jest.Mock;
const mockCadence = getUserPostCadence as jest.Mock;
const mockCounts = getUserPostCounts as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;

const USER = "author-1";

/** `month` repeats in the URL, so Next hands back an array once more than one
    is selected — the helper has to allow both shapes. */
function render_(params: { access?: string; month?: string | string[]; q?: string } = {}) {
  return Dashboard({ searchParams: Promise.resolve(params) });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { user: { id: USER } } });
  mockCounts.mockResolvedValue({ published: 42, private: 18, drafts: 1 });
  mockCadence.mockResolvedValue([
    { month: "2026-06", count: 6 },
    { month: "2026-07", count: 10 },
    { month: "2026-08", count: 8 },
  ]);
  mockArchive.mockResolvedValue([
    { id: 3, post_name: "Seattle", post_date: "2026-08-21", access: 1 },
    { id: 2, post_name: "A private one", post_date: "2026-08-02", access: 2 },
    { id: 1, post_name: "Older", post_date: "2026-07-04", access: 1 },
  ]);
});

describe("Dashboard — summary", () => {
  it("leads with published, private and draft counts", async () => {
    render(await render_());

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Drafts")).toBeInTheDocument();
  });

  it("points the drafts stat at the drafts page", async () => {
    render(await render_());

    const draftsStat = screen.getByText("Drafts").closest("a");
    expect(draftsStat).toHaveAttribute("href", "/drafts");
  });

  /** Two of the three cards filter in place and one navigates away. Identical
      cards behaving differently is the confusion an affordance has to prevent,
      so the Drafts card says so — visually with an arrow, and in text for
      anyone who won't see it. */
  it("marks the Drafts card as leaving the page", async () => {
    render(await render_());

    const drafts = screen.getByText("Drafts").closest("a")!;
    expect(within(drafts).getByText("(opens the drafts page)")).toBeInTheDocument();
  });

  it("keeps the arrow out of the accessible name, since the link already announces itself", async () => {
    render(await render_());

    const drafts = screen.getByText("Drafts").closest("a")!;
    expect(drafts.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("gives the filtering cards no such affordance", async () => {
    render(await render_());

    const published = screen.getByText("Published").closest("a")!;
    expect(within(published).queryByText(/opens the/)).not.toBeInTheDocument();
    expect(published.querySelector("svg")).toBeNull();
  });

  /** The card already states the count; a separate banner saying the same thing
      a few pixels away was pure duplication. */
  it("does not repeat the draft count in a second prompt", async () => {
    mockCounts.mockResolvedValue({ published: 5, private: 0, drafts: 3 });

    render(await render_());

    expect(screen.queryByText(/in progress/)).not.toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("summarises the writing cadence in text, not only bars", async () => {
    render(await render_());

    expect(screen.getByText(/24 posts across 3 months/)).toBeInTheDocument();
  });
});

/** These render the inner async component directly — see its doc comment. */
function archive(filters: Record<string, unknown> = {}) {
  return DashboardArchive({ userId: USER, filters });
}

/** The href a stat links to, found by its visible label. */
function hrefFor(label: string) {
  return screen.getByText(label).closest("a")?.getAttribute("href");
}

describe("Dashboard — the archive", () => {
  it("lists the author's posts", async () => {
    render(await archive());

    expect(screen.getByRole("link", { name: "Seattle" })).toHaveAttribute("href", "/posts/3");
    expect(screen.getByRole("link", { name: "Older" })).toHaveAttribute("href", "/posts/1");
  });

  /** The dashboard is the only place private work is visible, so the badge
      distinguishing it is load-bearing rather than decorative. */
  it("marks which posts are private", async () => {
    render(await archive());

    expect(screen.getByText("Private", { selector: "span" })).toBeInTheDocument();
    expect(screen.getAllByText("Public")).toHaveLength(2);
  });

  it("offers edit on every row", async () => {
    render(await archive());

    expect(screen.getAllByTestId("edit-btn")).toHaveLength(3);
  });

  /** Deleting moved to the post's own page. In a dense list of near-identical
      rows an irreversible action sat a thumb's width from whatever you were
      scrolling past; on the post you can see what you're destroying. */
  it("keeps delete out of the list entirely", async () => {
    render(await archive());

    expect(screen.queryAllByTestId("delete-btn")).toHaveLength(0);
  });

  it("groups by month like the public archive", async () => {
    render(await archive());

    expect(screen.getByRole("heading", { level: 3, name: "August" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "July" })).toBeInTheDocument();
  });

  it("says so when the author has published nothing", async () => {
    mockArchive.mockResolvedValue([]);

    render(await archive());

    expect(screen.getByText("You haven't published anything yet.")).toBeInTheDocument();
  });
});

describe("Dashboard — filtering the archive", () => {
  it("passes every active filter to the one query", async () => {
    render(await archive({ access: ACCESS_PRIVATE, months: ["2026-08"], q: "seattle" }));

    expect(mockArchive).toHaveBeenCalledWith(USER, {
      access: ACCESS_PRIVATE,
      months: ["2026-08"],
      q: "seattle",
    });
  });

  it("reports the result count while filtered", async () => {
    render(await archive({ access: ACCESS_PUBLIC }));

    expect(screen.getByText("3 posts")).toBeInTheDocument();
  });

  it("stays quiet about counts when nothing is filtered", async () => {
    render(await archive());

    expect(screen.queryByText("3 posts")).not.toBeInTheDocument();
  });

  it("distinguishes an empty filter result from an empty account", async () => {
    mockArchive.mockResolvedValue([]);

    render(await archive({ months: ["2026-01"] }));

    expect(screen.getByText("Nothing matches those filters.")).toBeInTheDocument();
  });
});

describe("Dashboard — stat toggles", () => {
  it("links Published to its own filter", async () => {
    render(await render_());

    expect(hrefFor("Published")).toBe("/dashboard?access=public");
  });

  /** "Click again deactivates" — the active stat links back to the unfiltered
      view rather than re-applying itself. */
  it("links the active stat back to no filter", async () => {
    render(await render_({ access: "public" }));

    expect(hrefFor("Published")).toBe("/dashboard");
  });

  it("marks the active stat for assistive tech", async () => {
    render(await render_({ access: "private" }));

    expect(screen.getByText("Private").closest("a")).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Published").closest("a")).not.toHaveAttribute("aria-current");
  });

  it("switches directly between the two rather than stacking them", async () => {
    render(await render_({ access: "public" }));

    expect(hrefFor("Private")).toBe("/dashboard?access=private");
  });

  it("keeps Drafts a plain link, since drafts are never in this archive", async () => {
    render(await render_({ access: "public" }));

    expect(hrefFor("Drafts")).toBe("/drafts");
  });

  it("carries other filters through when toggling", async () => {
    render(await render_({ month: "2026-08", q: "seattle" }));

    expect(hrefFor("Published")).toBe("/dashboard?access=public&month=2026-08&q=seattle");
  });

  it("ignores an access value it does not recognise", async () => {
    render(await render_({ access: "draft" }));

    expect(mockArchive).not.toHaveBeenCalledWith(USER, expect.objectContaining({ access: 4 }));
  });
});

describe("Dashboard — month filter", () => {
  it("links each month with posts to its own filter", async () => {
    render(await render_());

    expect(screen.getByRole("link", { name: /Add Aug 2026/ })).toHaveAttribute(
      "href",
      "/dashboard?month=2026-08",
    );
  });

  /** Months union rather than replace: selecting a second keeps the first, so a
      run of months can be examined together. */
  it("adds a second month to the selection instead of replacing the first", async () => {
    render(await render_({ month: "2026-08" }));

    expect(screen.getByRole("link", { name: /Add Jul 2026/ })).toHaveAttribute(
      "href",
      "/dashboard?month=2026-07&month=2026-08",
    );
  });

  it("removes just the one month when an active bar is selected again", async () => {
    render(await render_({ month: ["2026-07", "2026-08"] }));

    expect(screen.getByRole("link", { name: /Remove Aug 2026/ })).toHaveAttribute(
      "href",
      "/dashboard?month=2026-07",
    );
  });

  it("marks every selected month, not only the last", async () => {
    render(await render_({ month: ["2026-07", "2026-08"] }));

    expect(screen.getByRole("link", { name: /Remove Jul 2026/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /Remove Aug 2026/ })).toHaveAttribute("aria-current", "true");
  });

  it("passes the whole selection to the query", async () => {
    render(await archive({ months: ["2026-07", "2026-08"] }));

    expect(mockArchive).toHaveBeenCalledWith(USER, expect.objectContaining({
      months: ["2026-07", "2026-08"],
    }));
  });

  /** Sorted, so the same selection is the same URL however it was clicked —
      which keeps it shareable and the Suspense key stable. */
  it("orders months in the URL independently of click order", async () => {
    render(await render_({ month: "2026-08" }));

    expect(screen.getByRole("link", { name: /Add Jun 2026/ })).toHaveAttribute(
      "href",
      "/dashboard?month=2026-06&month=2026-08",
    );
  });

  /** A bar is a shape; its accessible name has to carry the month, the count,
      and what activating it will do. */
  it("names each bar with its month and count", async () => {
    render(await render_());

    expect(screen.getByRole("link", { name: "Add Jul 2026 (10 posts)" })).toBeInTheDocument();
  });

  it("offers no link for a month with nothing in it", async () => {
    mockCadence.mockResolvedValue([
      { month: "2026-07", count: 0 },
      { month: "2026-08", count: 8 },
    ]);

    render(await render_());

    expect(screen.queryByRole("link", { name: /Jul 2026/ })).not.toBeInTheDocument();
  });
});

describe("Dashboard — clearing", () => {
  it("offers a way out once any filter is on", async () => {
    render(await render_({ access: "public" }));

    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/dashboard");
  });

  it("keeps the search term when clearing filters", async () => {
    render(await render_({ access: "public", q: "seattle" }));

    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/dashboard?q=seattle",
    );
  });

  it("shows no clear link when nothing is filtered", async () => {
    render(await render_());

    expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();
  });
});

describe("Dashboard — access", () => {
  it("redirects a signed-out visitor", async () => {
    mockGetSession.mockResolvedValue({ data: null });

    await expect(render_()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/auth/sign-in");
  });

  it("scopes every query to the signed-in author", async () => {
    render(await render_());

    expect(mockCounts).toHaveBeenCalledWith(USER);
    expect(mockCadence).toHaveBeenCalledWith(USER);
  });
});

describe("Dashboard — structure", () => {
  it("has exactly one h1", async () => {
    render(await render_());

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Your Posts");
  });

  it("carries the skip-link target", async () => {
    const { container } = render(await render_());

    expect(container.querySelector("#main-content")).toBeInTheDocument();
  });

  it("keeps list items inside a list", async () => {
    const { container } = render(await archive());

    for (const ul of Array.from(container.querySelectorAll("ul"))) {
      for (const child of Array.from(ul.children)) {
        expect(child.tagName).toBe("LI");
      }
    }
    expect(within(container.querySelector("ul")!).getAllByRole("listitem").length).toBeGreaterThan(0);
  });
});
