import { render, screen } from "@testing-library/react";
import { PostArchiveSkeleton } from "@/ui/posts/PostArchiveSkeleton";

/** A skeleton that doesn't match what replaces it causes a reflow at the swap —
    the one thing a skeleton exists to prevent. These pin the shape against
    PostArchiveList: a year rule, month blocks, and a fixed-width day column. */
describe("PostArchiveSkeleton", () => {
  it("announces itself as busy to assistive tech", () => {
    render(<PostArchiveSkeleton />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading your posts")).toBeInTheDocument();
  });

  it("hides the decorative bars from assistive tech", () => {
    const { container } = render(<PostArchiveSkeleton />);

    const bars = container.querySelectorAll(".skeleton");
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach((bar) => expect(bar).toHaveAttribute("aria-hidden", "true"));
  });

  it("mirrors the real list's month structure", () => {
    const { container } = render(<PostArchiveSkeleton months={3} />);

    expect(container.querySelectorAll("ul")).toHaveLength(3);
  });

  it("keeps list items inside lists, like the component it stands in for", () => {
    const { container } = render(<PostArchiveSkeleton />);

    for (const ul of Array.from(container.querySelectorAll("ul"))) {
      for (const child of Array.from(ul.children)) {
        expect(child.tagName).toBe("LI");
      }
    }
  });

  it("reserves the same fixed-width day column so titles don't shift on swap", () => {
    const { container } = render(<PostArchiveSkeleton />);

    expect(container.querySelector("li .w-6")).toBeInTheDocument();
  });
});
