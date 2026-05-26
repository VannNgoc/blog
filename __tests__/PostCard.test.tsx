import { render, screen } from "@testing-library/react";
import { PostCard } from "@/ui/posts/PostCard";
import type { PostRow } from "@/type/post";

// Mock Next.js Link
jest.mock("next/link", () => {
  return ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
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

const mockPost: PostRow = {
  id: 1,
  post_name: "Hello World",
  post_date: "2024-03-15",
  post_body: "This is the body of the post.",
  post_tags: null,
  post_author: "user-123",
};

describe("PostCard", () => {
  it("renders the post title", () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders the post body", () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText("This is the body of the post.")).toBeInTheDocument();
  });

  it("renders a formatted post date", () => {
    render(<PostCard post={mockPost} />);
    const date = new Date("2024-03-15").toLocaleDateString();
    expect(screen.getByText(date)).toBeInTheDocument();
  });

  it("links to the correct post page", () => {
    render(<PostCard post={mockPost} />);
    const link = screen.getByRole("link", { name: /hello world/i });
    expect(link).toHaveAttribute("href", "/posts/1");
  });

  it("renders the DeletePostConfirmButton when user is the author", () => {
    render(<PostCard post={mockPost} currentUserId="user-123" />);
    const btn = screen.getByTestId("confirm-delete-btn");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("data-id", "1");
  });

  it("renders the EditButton when user is the author", () => {
    render(<PostCard post={mockPost} currentUserId="user-123" />);
    const editBtn = screen.getByTestId("edit-btn");
    expect(editBtn).toHaveAttribute("href", "/posts/1/edit");
  });

  it("hides edit and delete buttons for non-owners", () => {
    render(<PostCard post={mockPost} currentUserId="other-user" />);
    expect(screen.queryByTestId("confirm-delete-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-btn")).not.toBeInTheDocument();
  });

  it("hides edit and delete buttons when not logged in", () => {
    render(<PostCard post={mockPost} />);
    expect(screen.queryByTestId("confirm-delete-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-btn")).not.toBeInTheDocument();
  });

  it("wraps content in a list item", () => {
    const { container } = render(<PostCard post={mockPost} />);
    expect(container.querySelector("li")).toBeInTheDocument();
  });
});
