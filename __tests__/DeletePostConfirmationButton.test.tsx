import '@testing-library/jest-dom'
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeletePostConfirmButton } from "@/ui/posts/DeletePostConfirmationButton";

// Mock the server action
jest.mock("@/lib/posts/actions", () => ({
  deletePostAction: jest.fn(),
  deletePostForeverAction: jest.fn(),
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

  /** A first delete only moves the post to the trash, so the dialog must not
      claim it can't be undone. */
  it("says a delete can be restored from the trash", async () => {
    render(<DeletePostConfirmButton id={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Move to trash?")).toBeInTheDocument();
    expect(screen.getByText(/restore it from Trash for 30 days/)).toBeInTheDocument();
    expect(screen.queryByText(/can\u2019t be undone/)).not.toBeInTheDocument();
  });

  it("shows Cancel and Move to trash buttons in the modal", async () => {
    render(<DeletePostConfirmButton id={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move to trash" })).toBeInTheDocument();
  });

  it("warns plainly when deleting from the trash is permanent", async () => {
    render(<DeletePostConfirmButton id={1} label="Delete forever" permanent />);
    await userEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    expect(screen.getByText("Delete forever?")).toBeInTheDocument();
    expect(screen.getByText(/can\u2019t be undone/)).toBeInTheDocument();
    // The trigger shares the label, so look for the confirm button in the dialog.
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete forever" })).toBeInTheDocument();
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
