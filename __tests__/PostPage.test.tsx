// Mock next/navigation so notFound() halts execution like the real one does.
// useRouter is also mocked since PostKeyboardNav (rendered by the page) calls
// it — its actual push behavior is covered by PostKeyboardNav's own tests.
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("@/lib/posts/queries", () => ({
  getPostById: jest.fn(),
  getAdjacentPosts: jest.fn(),
}));

// Mock the Tiptap read-only viewer so the page test stays focused on access
// control (avoids loading the full editor + extensions in jsdom).
jest.mock("@/components/tiptap-templates/simple/post-content", () => ({
  PostContent: () => <div data-testid="post-body" />,
}));

// Mock auth to avoid loading @neondatabase/auth ESM package in Jest
jest.mock("@/lib/auth/server", () => ({
  auth: {
    getSession: jest.fn(),
  },
}));

jest.mock("next/link", () => {
  function MockLink({ href, children }: { href: string; children: ReactNode }) {
    return <a href={href}>{children}</a>;
  }
  return MockLink;
});

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import Page, { generateMetadata } from "@/app/posts/[id]/page";
import { getPostById, getAdjacentPosts } from "@/lib/posts/queries";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/server";

const mockGetPostById = getPostById as jest.Mock;
const mockGetAdjacentPosts = getAdjacentPosts as jest.Mock;
const mockNotFound = notFound as unknown as jest.Mock;
const mockGetSession = auth.getSession as jest.Mock;

const privatePost = {
  id: 7,
  post_name: "Private Reflection",
  post_author: "author-1",
  post_date: new Date("2024-05-01"),
  post_edit_date: null,
  post_body: "For my eyes only.",
  access: 2,
  username: "author",
};

const publicPost = { ...privatePost, access: 1, post_name: "Public Post" };

function renderPage(id: string) {
  // Server component: invoke it directly, then render the returned JSX
  return Page({ params: Promise.resolve({ id }) });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: null });
  mockGetAdjacentPosts.mockResolvedValue({ newer: undefined, older: undefined });
});

describe("post detail page access control", () => {
  it("returns notFound for a private post when not signed in", async () => {
    mockGetPostById.mockResolvedValue(privatePost);

    await expect(renderPage("7")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("returns notFound for a private post when signed in as a different user", async () => {
    mockGetPostById.mockResolvedValue(privatePost);
    mockGetSession.mockResolvedValue({ data: { user: { id: "other-user" } } });

    await expect(renderPage("7")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders a private post for its author", async () => {
    mockGetPostById.mockResolvedValue(privatePost);
    mockGetSession.mockResolvedValue({ data: { user: { id: "author-1" } } });

    render(await renderPage("7"));

    expect(screen.getByText("Private Reflection")).toBeInTheDocument();
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("renders a public post for anonymous visitors", async () => {
    mockGetPostById.mockResolvedValue(publicPost);

    render(await renderPage("7"));

    expect(screen.getByText("Public Post")).toBeInTheDocument();
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  /** The post title is this page's only top-level heading. It shipped as an
      h2, leaving the most-shared page type on the site with no h1 — and
      Lighthouse scores it 100 regardless, because `heading-order` only flags
      skipped levels, never a missing top level. */
  it("renders the post title as the page's h1", async () => {
    mockGetPostById.mockResolvedValue(publicPost);

    render(await renderPage("7"));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Public Post");
  });

  it("has exactly one h1", async () => {
    mockGetPostById.mockResolvedValue(publicPost);

    render(await renderPage("7"));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("returns notFound when the post does not exist", async () => {
    mockGetPostById.mockResolvedValue(undefined);

    await expect(renderPage("999")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns notFound for a non-numeric id", async () => {
    await expect(renderPage("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockGetPostById).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  function metadataFor(id: string) {
    return generateMetadata({ params: Promise.resolve({ id }) });
  }

  it("returns title, description, and OG tags for a public post", async () => {
    mockGetPostById.mockResolvedValue({
      ...publicPost,
      id: 101,
      post_description: "A short teaser.",
    });

    const metadata = await metadataFor("101");

    expect(metadata.title).toBe("Public Post");
    expect(metadata.description).toBe("A short teaser.");
    expect(metadata.openGraph).toMatchObject({
      title: "Public Post",
      description: "A short teaser.",
      type: "article",
    });
  });

  it("omits description when the post has none", async () => {
    mockGetPostById.mockResolvedValue({ ...publicPost, id: 102, post_description: null });

    const metadata = await metadataFor("102");

    expect(metadata.title).toBe("Public Post");
    expect(metadata.description).toBeUndefined();
  });

  it("does not leak a draft post's title into metadata", async () => {
    mockGetPostById.mockResolvedValue({ ...privatePost, id: 103, access: 4 });

    const metadata = await metadataFor("103");

    expect(metadata).toEqual({});
  });

  it("does not leak a private post's title to an anonymous visitor", async () => {
    mockGetPostById.mockResolvedValue({ ...privatePost, id: 104 });
    mockGetSession.mockResolvedValue({ data: null });

    const metadata = await metadataFor("104");

    expect(metadata).toEqual({});
  });

  it("does not leak a private post's title to a different signed-in user", async () => {
    mockGetPostById.mockResolvedValue({ ...privatePost, id: 105 });
    mockGetSession.mockResolvedValue({ data: { user: { id: "other-user" } } });

    const metadata = await metadataFor("105");

    expect(metadata).toEqual({});
  });

  it("returns the real title for a private post viewed by its author", async () => {
    mockGetPostById.mockResolvedValue({ ...privatePost, id: 106 });
    mockGetSession.mockResolvedValue({ data: { user: { id: "author-1" } } });

    const metadata = await metadataFor("106");

    expect(metadata.title).toBe("Private Reflection");
  });

  it("returns empty metadata when the post does not exist", async () => {
    mockGetPostById.mockResolvedValue(undefined);

    const metadata = await metadataFor("999");

    expect(metadata).toEqual({});
  });

  it("returns empty metadata for a non-numeric id without querying the database", async () => {
    const metadata = await metadataFor("abc");

    expect(metadata).toEqual({});
    expect(mockGetPostById).not.toHaveBeenCalled();
  });
});
