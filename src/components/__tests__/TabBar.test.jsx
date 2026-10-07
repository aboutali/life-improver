import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import TabBar from "../TabBar.jsx";
import Header from "../Header.jsx";

describe("TabBar", () => {
  it("renders nothing on the welcome screen", () => {
    const { container } = render(<TabBar path="/welcome" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers six tabs on top and four icon links in the bottom nav", () => {
    render(<TabBar path="/journey" />);
    expect(within(screen.getByRole("navigation", { name: "Main" })).getAllByRole("link")).toHaveLength(6);
    const bottom = within(screen.getByRole("navigation", { name: "Primary" }));
    expect(bottom.getAllByRole("link").map((a) => a.textContent)).toEqual(["Today", "Journey", "Assess", "Practices"]);
    expect(bottom.getByRole("link", { name: "Journey" })).toHaveAttribute("aria-current", "page");
    expect(bottom.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  });
});

describe("Header", () => {
  it("is a slim wordmark linking home", () => {
    render(<Header path="/" />);
    expect(screen.getByRole("link", { name: "Life Improver" })).toHaveAttribute("href", "#/");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
