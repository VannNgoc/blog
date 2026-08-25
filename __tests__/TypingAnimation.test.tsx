import { render, screen } from "@testing-library/react";
import { TypingAnimation } from "@/components/magicui/typing-animation";

describe("TypingAnimation", () => {
  /** The regression this component exists to avoid: it used to hold the text in
      `useState("")`, so the server rendered an empty heading and the words only
      appeared after hydration. On the landing page that heading is the largest
      text on screen, so the delay landed straight on LCP. */
  it("renders the complete text synchronously, with no effect or timer involved", () => {
    render(<TypingAnimation text="recollections" as="h1" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("recollections");
  });

  it("drives the reveal from CSS variables sized to the text", () => {
    render(<TypingAnimation text="recollections" duration={95} as="h1" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("typing");
    // 13 characters, one step each, 13 * 95ms of total runtime.
    expect(heading.style.getPropertyValue("--typing-steps")).toBe("13");
    expect(heading.style.getPropertyValue("--typing-duration")).toBe("1.235s");
  });

  it("keeps any className the caller passes alongside the animation hook", () => {
    render(<TypingAnimation text="hi" className="text-6xl" as="h1" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("typing");
    expect(heading).toHaveClass("text-6xl");
  });

  it("renders as a span by default", () => {
    const { container } = render(<TypingAnimation text="hi" />);

    expect(container.querySelector("span.typing")).toBeInTheDocument();
  });
});
