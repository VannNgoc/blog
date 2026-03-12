import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeletePostConfirmButton } from "@/ui/posts/DeletePostConfirmationButton";

// Mock the server action
jest.mock("@/lib/posts/actions", () => ({
  deletePostAction: jest.fn(),
}));

describe("DeletePostConfirmButton", () => {
  // ─── Initial Render ───────────────────────────────────────────────

  it("renders the Delete trigger button", () => {
    render(<DeletePostConfirmButton id={1} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show the modal on initial render", () => {
    render(<DeletePostConfirmButton id={1} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── Opening the Modal ────────────────────────────────────────────

  it("opens the modal when Delete is clicked", async () => {
    render(<DeletePostConfirmButton id={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the confirmation message in the modal", async () => {
    render(<DeletePostConfirmButton id={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete post?")).toBeInTheDocument();
    expect(screen.getByText("This action can\u2019t be undone.")).toBeInTheDocument();
  });

  it("shows Cancel and Yes, delete buttons in the modal", async () => {
    render(<DeletePostConfirmButton id={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, delete" })).toBeInTheDocument();
  });

  // ─── Closing the Modal ────────────────────────────────────────────

  it("closes the modal when Cancel is clicked", async () => {
    render(<DeletePostConfirmButton id={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── Hidden Form ──────────────────────────────────────────────────

  it("renders a hidden input with the correct post id", () => {
    render(<DeletePostConfirmButton id={42} />);
    const input = document.querySelector('input[name="id"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("42");
  });
});
