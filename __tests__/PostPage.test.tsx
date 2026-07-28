// Mock next/navigation so notFound() halts execution like the real one does
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
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
import Page from "@/app/posts/[id]/page";
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
  return Page({ params: { id } });
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

  it("returns notFound when the post does not exist", async () => {
    mockGetPostById.mockResolvedValue(undefined);

    await expect(renderPage("999")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns notFound for a non-numeric id", async () => {
    await expect(renderPage("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockGetPostById).not.toHaveBeenCalled();
  });
});
