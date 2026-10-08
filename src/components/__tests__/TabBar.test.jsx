import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
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

describe("TabBar on flows and pushed screens", () => {
  it("drops the bottom nav on Check-in and Settings but keeps the top tabs", () => {
    for (const path of ["/checkin", "/settings"]) {
      const { unmount } = render(<TabBar path={path} />);
      expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
      unmount();
    }
  });

  it("renders nothing on every welcome step", () => {
    for (const path of ["/welcome", "/welcome/rate", "/welcome/focus"]) {
      const { container, unmount } = render(<TabBar path={path} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("keeps the bottom nav on the tab screens and on Framework and Sources", () => {
    for (const path of ["/", "/journey", "/assess", "/practices", "/framework", "/sources"]) {
      const { unmount } = render(<TabBar path={path} />);
      expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
      unmount();
    }
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

  it("shows a Back button to the parent route on pushed screens", () => {
    const cases = [
      ["/checkin", "Back to Today", "#/"],
      ["/settings", "Back to Today", "#/"],
      ["/framework", "Back to Practices", "#/practices"],
      ["/sources", "Back to Practices", "#/practices"],
      ["/welcome/rate", "Back to Welcome", "#/welcome"],
      ["/welcome/focus", "Back to the ratings", "#/welcome/rate"],
    ];
    for (const [path, name, to] of cases) {
      const { unmount } = render(<Header path={path} />);
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", to);
      unmount();
    }
  });

  it("has no Back button on the tab screens or the first welcome step", () => {
    for (const path of ["/", "/journey", "/assess", "/practices", "/welcome"]) {
      const { unmount } = render(<Header path={path} />);
      expect(screen.queryByRole("link", { name: /^Back/ })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("names the screen in a small title that stays on when there is no IntersectionObserver", () => {
    const { container, rerender } = render(<Header path="/journey" />);
    const title = container.querySelector(".hd-title");
    expect(title).toHaveTextContent("Journey");
    expect(title).toHaveClass("on");
    expect(title).toHaveAttribute("aria-hidden", "true");
    rerender(<Header path="/welcome/rate" />);
    expect(container.querySelector(".hd-title")).toHaveTextContent("Welcome");
  });

  it("shows the small title only once the large title leaves the viewport", async () => {
    let callback;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb) {
          callback = cb;
        }
        observe = observe;
        disconnect = disconnect;
      }
    );
    try {
      const { container, unmount } = render(
        <>
          <Header path="/journey" />
          <main id="main">
            <h2>Journey</h2>
          </main>
        </>
      );
      const title = container.querySelector(".hd-title");
      await waitFor(() => expect(observe).toHaveBeenCalledWith(container.querySelector("main h2")));
      expect(title).not.toHaveClass("on");
      act(() => callback([{ isIntersecting: false }]));
      expect(title).toHaveClass("on");
      act(() => callback([{ isIntersecting: true }]));
      expect(title).not.toHaveClass("on");
      unmount();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
