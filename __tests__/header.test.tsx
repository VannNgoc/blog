jest.mock("@/lib/auth/server", () => ({
  auth: { getSession: jest.fn().mockResolvedValue({ data: null }) },
}));

// NavigationMenu pulls in SignOutButton -> @/lib/auth/client, an ESM-only
// package Jest can't parse without extra config. It's irrelevant to what
// this test checks (the header's own landmark markup), so stub it out.
jest.mock("@/ui/NavigationMenu", () => ({
  NavigationMenu: () => null,
}));

jest.mock("@/ui/ThemeToggle", () => ({
  ThemeToggle: () => null,
}));

import { render, screen } from "@testing-library/react";
import Header from "@/ui/header";

describe("Header", () => {
  // HeaderGreeting/HeaderNav are async Server Components — real Next.js
  // streams them via RSC, but plain ReactDOM (what jsdom/RTL renders with
  // here) doesn't support async function components and logs errors while
  // still recovering to render the rest of the tree. The <header> landmark
  // itself is unaffected, which is all this test is checking.
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders a semantic <header> landmark", async () => {
    render(<Header />);
    expect(await screen.findByRole("banner")).toBeInTheDocument();
  });

  it("wraps the wordmark in a link to the homepage", async () => {
    render(<Header />);
    const homeLink = await screen.findByRole("link", { name: /recollections/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
