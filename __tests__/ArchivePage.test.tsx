jest.mock("@/lib/posts/queries", () => ({
  getPublicPostArchive: jest.fn(),
}));

// PostArchiveList pulls in the row actions, which reach @vercel/blob through
// the server actions — ESM that jest can't parse. The public archive renders
// neither, so stubbing them keeps this test on the markup it actually cares
// about. (Same approach as PostCard.test.tsx.)
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

jest.mock("next/link", () => {
  function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  }
  return MockLink;
});

import { render, screen, within } from "@testing-library/react";
import ArchivePage from "@/app/archive/page";
import { getPublicPostArchive } from "@/lib/posts/queries";

const mockArchive = getPublicPostArchive as jest.Mock;

/** post_date is a DATE column — no time, no zone. The strings below are what
    the driver hands back, and the page must read them as UTC. */
function post(id: number, name: string, date: string) {
  return { id, post_name: name, post_date: date };
}

beforeEach(() => jest.clearAllMocks());

describe("Archive page", () => {
  it("lists every post the query returned", async () => {
    mockArchive.mockResolvedValue([
      post(3, "Seattle", "2026-08-21"),
      post(2, "Deep Creek Lake", "2026-07-04"),
      post(1, "A Serpent", "2025-12-30"),
    ]);

    render(await ArchivePage());

    expect(screen.getByRole("link", { name: /Seattle/ })).toHaveAttribute("href", "/posts/3");
    expect(screen.getByRole("link", { name: /Deep Creek Lake/ })).toHaveAttribute("href", "/posts/2");
    expect(screen.getByRole("link", { name: /A Serpent/ })).toHaveAttribute("href", "/posts/1");
  });

  it("groups posts under a heading per year", async () => {
    mockArchive.mockResolvedValue([
      post(3, "Seattle", "2026-08-21"),
      post(1, "A Serpent", "2025-12-30"),
    ]);

    render(await ArchivePage());

    expect(screen.getByRole("heading", { level: 2, name: "2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "2025" })).toBeInTheDocument();
  });

  it("groups posts by month within a year", async () => {
    mockArchive.mockResolvedValue([
      post(3, "Seattle", "2026-08-21"),
      post(2, "Shinobazu", "2026-08-02"),
      post(1, "Deep Creek Lake", "2026-07-04"),
    ]);

    render(await ArchivePage());

    expect(screen.getByRole("heading", { level: 3, name: "August" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "July" })).toBeInTheDocument();
  });

  it("keeps the newest-first order the query established", async () => {
    mockArchive.mockResolvedValue([
      post(3, "Newest", "2026-08-21"),
      post(2, "Middle", "2026-08-02"),
      post(1, "Oldest", "2025-01-15"),
    ]);

    render(await ArchivePage());

    const titles = screen.getAllByRole("link").map((a) => a.textContent);
    expect(titles.join(" ").indexOf("Newest")).toBeLessThan(titles.join(" ").indexOf("Middle"));
    expect(titles.join(" ").indexOf("Middle")).toBeLessThan(titles.join(" ").indexOf("Oldest"));
  });

  /** A DATE read in a timezone west of UTC lands on the previous day, which
      would file a post dated the 1st under the wrong month entirely. */
  it("files a first-of-the-month post under that month, not the previous one", async () => {
    mockArchive.mockResolvedValue([post(1, "First of August", "2026-08-01")]);

    render(await ArchivePage());

    expect(screen.getByRole("heading", { level: 3, name: "August" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "July" })).not.toBeInTheDocument();
  });

  /** The day sits beside the link rather than inside it, so each link's
      accessible name is the title alone — a screen-reader link list reads
      "Seattle", not "21 Seattle". */
  it("shows the day number beside the title, outside the link", async () => {
    mockArchive.mockResolvedValue([post(1, "Seattle", "2026-08-21")]);

    render(await ArchivePage());

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("21")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seattle" })).toBeInTheDocument();
  });

  it("counts the posts, pluralised", async () => {
    mockArchive.mockResolvedValue([
      post(1, "One", "2026-08-21"),
      post(2, "Two", "2026-08-20"),
    ]);

    render(await ArchivePage());

    expect(screen.getByText(/2 posts, newest first/)).toBeInTheDocument();
  });

  it("uses the singular for a lone post", async () => {
    mockArchive.mockResolvedValue([post(1, "Only", "2026-08-21")]);

    render(await ArchivePage());

    expect(screen.getByText(/1 post, newest first/)).toBeInTheDocument();
  });

  it("says so when there is nothing to show", async () => {
    mockArchive.mockResolvedValue([]);

    render(await ArchivePage());

    expect(screen.getByText("No posts yet.")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("has one h1 and does not skip a heading level", async () => {
    mockArchive.mockResolvedValue([post(1, "Seattle", "2026-08-21")]);

    render(await ArchivePage());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Archive");
  });

  it("trims stray whitespace in stored titles", async () => {
    mockArchive.mockResolvedValue([post(1, "Deep Creek Lake, Maryland ", "2026-08-21")]);

    render(await ArchivePage());

    expect(screen.getByRole("link", { name: "Deep Creek Lake, Maryland" })).toBeInTheDocument();
  });
});
