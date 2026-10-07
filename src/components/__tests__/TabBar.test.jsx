import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByRole("heading", { level: 1 })).toContainElement(screen.getByRole("link", { name: "Life Improver" }));
  });

  it("has a skip link first that focuses main without changing the hash", async () => {
    render(
      <>
        <Header path="/" />
        <main id="main" tabIndex={-1} />
      </>
    );
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(screen.getAllByRole("link")[0]).toBe(skip);
    window.location.hash = "#/journey";
    await userEvent.click(skip);
    expect(document.getElementById("main")).toHaveFocus();
    expect(window.location.hash).toBe("#/journey");
    window.location.hash = "";
  });

  it("links to Settings and marks it current on that route", () => {
    const { rerender } = render(<Header path="/" />);
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("href", "#/settings");
    expect(link).not.toHaveAttribute("aria-current");
    rerender(<Header path="/settings" />);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  });
});
