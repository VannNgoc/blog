import { render, screen, fireEvent } from "@testing-library/react";
import { PostsNavBar } from "@/ui/posts/PostsNavBar";

const mockPush = jest.fn();
let mockPage: string | null = "1";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: (key: string) => (key === "page" ? mockPage : null) }),
}));

beforeEach(() => {
  mockPush.mockReset();
  mockPage = "1";
});

describe("PostsNavBar", () => {
  it("renders the correct number of page buttons", () => {
    render(<PostsNavBar numberPosts={25} />);
    // 25 posts / 10 per page = 3 pages
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("renders 1 button for 10 or fewer posts", () => {
    render(<PostsNavBar numberPosts={10} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("renders no buttons when there are no posts", () => {
    render(<PostsNavBar numberPosts={0} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("highlights the current page button", () => {
    mockPage = "2";
    render(<PostsNavBar numberPosts={30} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[1].className).toContain("bg-gray-800");
    expect(buttons[0].className).not.toContain("bg-gray-800");
    expect(buttons[2].className).not.toContain("bg-gray-800");
  });

  it("defaults to page 1 when no search param is set", () => {
    mockPage = null;
    render(<PostsNavBar numberPosts={20} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toContain("bg-gray-800");
    expect(buttons[1].className).not.toContain("bg-gray-800");
  });

  it("calls router.push with correct page param when a button is clicked", () => {
    render(<PostsNavBar numberPosts={20} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(mockPush).toHaveBeenCalledWith("?page=2");
  });

  it("calls router.push with page=1 when first button is clicked", () => {
    render(<PostsNavBar numberPosts={20} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(mockPush).toHaveBeenCalledWith("?page=1");
  });

  it("renders button labels as page numbers", () => {
    render(<PostsNavBar numberPosts={30} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
