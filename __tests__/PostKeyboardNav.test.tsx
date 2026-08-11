import { render } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { PostKeyboardNav } from "@/ui/posts/PostKeyboardNav";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockUseRouter = useRouter as jest.Mock;

function pressKey(key: string, modifiers: Partial<KeyboardEventInit> = {}, target: EventTarget = document) {
  // react-hotkeys-hook matches on the physical `code`, not `key` — for the
  // arrow keys they're the same string, but both must be set for the event
  // to be recognized the way a real keypress would be.
  const event = new KeyboardEvent("keydown", {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  target.dispatchEvent(event);
}

describe("PostKeyboardNav", () => {
  let push: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    mockUseRouter.mockReturnValue({ push });
  });

  it("navigates to the next post on ArrowRight", () => {
    render(<PostKeyboardNav nextHref="/posts/2" previousHref="/posts/1" />);

    pressKey("ArrowRight");

    // Moving to a newer post is "forward", and must carry the same view
    // transition type the visible Next link uses so both animate identically.
    expect(push).toHaveBeenCalledWith("/posts/2", { transitionTypes: ["nav-forward"] });
  });

  it("navigates to the previous post on ArrowLeft", () => {
    render(<PostKeyboardNav nextHref="/posts/2" previousHref="/posts/1" />);

    pressKey("ArrowLeft");

    expect(push).toHaveBeenCalledWith("/posts/1", { transitionTypes: ["nav-back"] });
  });

  it("does nothing on ArrowRight when there is no next post", () => {
    render(<PostKeyboardNav previousHref="/posts/1" />);

    pressKey("ArrowRight");

    expect(push).not.toHaveBeenCalled();
  });

  it("does nothing on ArrowLeft when there is no previous post", () => {
    render(<PostKeyboardNav nextHref="/posts/2" />);

    pressKey("ArrowLeft");

    expect(push).not.toHaveBeenCalled();
  });

  it("ignores the keypress while a modifier key is held", () => {
    render(<PostKeyboardNav nextHref="/posts/2" previousHref="/posts/1" />);

    pressKey("ArrowRight", { metaKey: true });
    pressKey("ArrowLeft", { altKey: true });

    expect(push).not.toHaveBeenCalled();
  });

  it("ignores the keypress while typing in an input", () => {
    const { container } = render(
      <>
        <input data-testid="search" />
        <PostKeyboardNav nextHref="/posts/2" previousHref="/posts/1" />
      </>
    );

    const input = container.querySelector("input") as HTMLInputElement;
    pressKey("ArrowRight", {}, input);

    expect(push).not.toHaveBeenCalled();
  });
});
