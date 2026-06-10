import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react";
import { EditButton } from "@/ui/posts/EditButton";
import type { ReactNode } from "react";

jest.mock("next/link", () => {
  function MockLink({ href, children, "aria-label": ariaLabel }: { href: string; children: ReactNode; "aria-label"?: string }) {
    return <a href={href} aria-label={ariaLabel}>{children}</a>;
  }
  return MockLink;
});

describe("EditButton", () => {
  it("renders the edit link", () => {
    render(<EditButton id={5} />);
    expect(screen.getByRole("link", { name: "edit" })).toBeInTheDocument();
  });

  it("links to the correct edit page", () => {
    render(<EditButton id={5} />);
    expect(screen.getByRole("link", { name: "edit" })).toHaveAttribute("href", "/posts/5/edit");
  });

  it("renders with different ids", () => {
    render(<EditButton id={99} />);
    expect(screen.getByRole("link", { name: "edit" })).toHaveAttribute("href", "/posts/99/edit");
  });

  it("renders the SVG icon inside the link", () => {
    const { container } = render(<EditButton id={1} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
