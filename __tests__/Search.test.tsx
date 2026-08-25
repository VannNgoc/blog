import { render, screen, fireEvent, act } from "@testing-library/react";
import { Search } from "@/ui/posts/Search";

const mockPush = jest.fn();
let mockQuery: string | null = null;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/posts",
  useSearchParams: () => new URLSearchParams(mockQuery ? { q: mockQuery } : {}),
}));

beforeEach(() => {
  mockPush.mockReset();
  mockQuery = null;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Search", () => {
  it("exposes an accessible name via its label", () => {
    render(<Search />);
    expect(screen.getByRole("textbox", { name: "Search posts" })).toBeInTheDocument();
  });

  it("initializes from the current 'q' search param", () => {
    mockQuery = "photography";
    render(<Search />);
    expect(screen.getByRole("textbox", { name: "Search posts" })).toHaveValue("photography");
  });

  it("does not show a clear button when the query is empty", () => {
    render(<Search />);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("shows a clear button once text is entered", () => {
    render(<Search />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search posts" }), {
      target: { value: "sunset" },
    });
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("debounces navigation, pushing the query 500ms after typing stops", () => {
    render(<Search />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search posts" }), {
      target: { value: "sunset" },
    });

    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockPush).toHaveBeenCalledWith("/posts?q=sunset");
  });

  it("resets the debounce timer on further typing instead of pushing early", () => {
    render(<Search />);
    const input = screen.getByRole("textbox", { name: "Search posts" });

    fireEvent.change(input, { target: { value: "sun" } });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    fireEvent.change(input, { target: { value: "sunset" } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/posts?q=sunset");
  });

  it("navigates to the bare pathname when the query is cleared", () => {
    mockQuery = "sunset";
    render(<Search />);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockPush).toHaveBeenCalledWith("/posts");
  });

  /** The effect used to fire unconditionally, so simply loading /posts
      re-requested the page the user had just loaded. Harmless when nothing
      showed it — but now that a pending spinner is wired to that navigation,
      it would flash on every visit. */
  it("does not navigate on mount when nothing has been typed", () => {
    render(<Search />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not navigate on mount when arriving on an existing query", () => {
    mockQuery = "sunset";
    render(<Search />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not re-navigate when typing ends back on the query already shown", () => {
    mockQuery = "sunset";
    render(<Search />);
    const input = screen.getByRole("textbox", { name: "Search posts" });

    fireEvent.change(input, { target: { value: "sunse" } });
    fireEvent.change(input, { target: { value: "sunset" } });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("exposes a live region so the in-between state reaches a screen reader", () => {
    render(<Search />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("returns focus to the input after clearing", () => {
    mockQuery = "sunset";
    render(<Search />);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(screen.getByRole("textbox", { name: "Search posts" })).toHaveFocus();
  });
});
