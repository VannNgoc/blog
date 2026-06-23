import { render, screen } from "@testing-library/react";
import { PostCard } from "@/ui/posts/PostCard";
import type { PostWithAuthorRow } from "@/type/post";
import type { ReactNode } from "react";

// Mock Next.js Link
jest.mock("next/link", () => {
  function MockLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return MockLink;
});

// Mock child action components
jest.mock("@/ui/posts/DeletePostConfirmationButton", () => ({
  DeletePostConfirmButton: ({ id }: { id: number }) => (
    <button data-testid="confirm-delete-btn" data-id={id}>
      Confirm Delete
    </button>
  ),
}));

jest.mock("@/ui/posts/EditButton", () => ({
  EditButton: ({ id }: { id: number }) => (
    <a data-testid="edit-btn" href={`/posts/${id}/edit`}>
      Edit
    </a>
  ),
}));

const mockPost: PostWithAuthorRow = {
  id: 1,
  post_name: "Hello World",
  post_author: "user-1",
  post_date: new Date("2024-03-15"),
  post_edit_date: null,
  post_body_json: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "This is the body of the post." }] },
    ],
  },
  post_description: null,
  access: 1,
  username: "testuser",
};

describe("PostCard", () => {
  it("renders the post title", () => {
    render(<PostCard post={mockPost} isAuthor={false} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders the post body", () => {
    render(<PostCard post={mockPost} isAuthor={false} />);
    expect(screen.getByText("This is the body of the post.")).toBeInTheDocument();
  });

  it("renders a formatted post date", () => {
    render(<PostCard post={mockPost} isAuthor={false} />);
    const date = new Date("2024-03-15").toLocaleDateString();
    expect(screen.getByText(date)).toBeInTheDocument();
  });

  it("links to the correct post page", () => {
    render(<PostCard post={mockPost} isAuthor={false} />);
    const link = screen.getByRole("link", { name: /hello world/i });
    expect(link).toHaveAttribute("href", "/posts/1");
  });

  it("renders the DeletePostConfirmButton with correct id when isAuthor", () => {
    render(<PostCard post={mockPost} isAuthor={true} />);
    const btn = screen.getByTestId("confirm-delete-btn");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("data-id", "1");
  });

  it("does not render DeletePostConfirmButton when not author", () => {
    render(<PostCard post={mockPost} isAuthor={false} />);
    expect(screen.queryByTestId("confirm-delete-btn")).not.toBeInTheDocument();
  });

  it("renders the EditButton linking to the edit page when isAuthor", () => {
    render(<PostCard post={mockPost} isAuthor={true} />);
    const editBtn = screen.getByTestId("edit-btn");
    expect(editBtn).toHaveAttribute("href", "/posts/1/edit");
  });

  it("does not render EditButton when not author", () => {
    render(<PostCard post={mockPost} isAuthor={false} />);
    expect(screen.queryByTestId("edit-btn")).not.toBeInTheDocument();
  });

  it("wraps content in a list item", () => {
    const { container } = render(<PostCard post={mockPost} isAuthor={false} />);
    expect(container.querySelector("li")).toBeInTheDocument();
  });
});
