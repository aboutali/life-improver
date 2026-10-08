import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import { KEYS, resetStorageStatus } from "../lib/storage.js";
import { clearNotice, setNotice } from "../lib/notice.js";

// Setting the hash queues a hashchange; let it fire before the test mounts anything.
beforeEach(async () => {
  resetStorageStatus();
  clearNotice();
  sessionStorage.clear();
  window.location.hash = "";
  await new Promise((r) => setTimeout(r, 0));
});

const seed = () => localStorage.setItem(KEYS.quick, JSON.stringify({ 1: 4, 2: 5, 3: 6, 4: 7 }));

describe("App", () => {
  it("sends a newcomer to the welcome screen by replacing the entry", async () => {
    const before = window.history.length;
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe("#/welcome"));
    expect(window.history.length).toBe(before);
    expect(screen.getByRole("heading", { level: 2, name: /Your whole life\.\s*In one view\./ })).toBeInTheDocument();
  });

  it("does not steal focus on first load", async () => {
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe("#/welcome"));
    expect(document.body).toHaveFocus();
  });

  it("moves focus to the new screen's first h2 after a route change", async () => {
    seed();
    window.location.hash = "#/";
    render(<App />);
    act(() => {
      window.location.hash = "#/settings";
    });
    await waitFor(() => expect(document.querySelector("main h2")).toHaveFocus());
    expect(document.querySelector("main h2")).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus inside a frame, cancels it on cleanup, and falls back to <main>", async () => {
    seed();
    const frames = new Map();
    let id = 0;
    const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      frames.set(++id, cb);
      return id;
    });
    const caf = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((n) => frames.delete(n));
    try {
      window.location.hash = "#/";
      const { unmount } = render(<App />);
      act(() => {
        window.location.hash = "#/settings";
      });
      await waitFor(() => expect(frames.size).toBeGreaterThan(0));
      expect(document.body).toHaveFocus(); // nothing moves until the frame runs
      // With no heading on screen, focus lands on <main>.
      document.querySelector("main h2").remove();
      act(() => {
        const due = [...frames.values()];
        frames.clear();
        due.forEach((cb) => cb());
      });
      expect(document.querySelector("main")).toHaveFocus();
      expect(document.querySelector("main")).toHaveAttribute("tabindex", "-1");
      // A pending frame is cancelled on unmount.
      act(() => {
        window.location.hash = "#/journey";
      });
      await waitFor(() => expect(frames.size).toBeGreaterThan(0));
      unmount();
      expect(frames.size).toBe(0);
    } finally {
      raf.mockRestore();
      caf.mockRestore();
    }
  });

  it("renders a single h1 holding the home link", () => {
    seed();
    render(<App />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Life Improver");
    expect(h1.querySelector("a")).toHaveAttribute("href", "#/");
  });

  it("treats an unknown hash as Today", async () => {
    seed();
    window.location.hash = "#/nowhere";
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe("#/"));
  });

  it("lists Framework, Sources and Settings & privacy in the footer", () => {
    seed();
    render(<App />);
    const foot = screen.getByRole("navigation", { name: "More" });
    expect(foot.querySelectorAll("a")).toHaveLength(3);
    expect(foot).toHaveTextContent("FrameworkSourcesSettings & privacy");
  });

  it("hides the bottom tabs and offers Back on Settings, and keeps both on a tab screen", async () => {
    seed();
    window.location.hash = "#/settings";
    render(<App />);
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Today" })).toHaveAttribute("href", "#/");
    act(() => {
      window.location.hash = "#/journey";
    });
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /^Back to/ })).not.toBeInTheDocument();
  });

  it("narrows the column for form screens and keeps 960 for the catalogue", async () => {
    seed();
    window.location.hash = "#/settings";
    render(<App />);
    expect(document.querySelector(".app-screen").style.maxWidth).toBe("720px");
    act(() => {
      window.location.hash = "#/practices";
    });
    await waitFor(() => expect(document.querySelector(".app-screen").style.maxWidth).toBe("960px"));
  });
});

describe("App routes and notices", () => {
  it("gives <main> an id and tabindex for the skip link", () => {
    seed();
    render(<App />);
    expect(document.querySelector("main")).toHaveAttribute("id", "main");
    expect(document.querySelector("main")).toHaveAttribute("tabindex", "-1");
  });

  it("renders the welcome wizard for its step routes", async () => {
    window.location.hash = "#/welcome/rate";
    render(<App />);
    expect(screen.getByRole("heading", { level: 2, name: "How does each ground feel?" })).toBeInTheDocument();
    expect(document.querySelector(".app-screen").style.maxWidth).toBe("720px");
  });

  it("shows a newcomer banner off the welcome screens, linking to the welcome", async () => {
    window.location.hash = "#/assess";
    render(<App />);
    const link = screen.getByRole("link", { name: "Begin with a one-minute welcome." });
    expect(link).toHaveAttribute("href", "#/welcome");
  });

  it("hides the newcomer banner on Check-in and Journey, whose empty states lead to the welcome", () => {
    window.location.hash = "#/checkin";
    const first = render(<App />);
    expect(first.container.textContent).not.toMatch(/New here\?/);
    first.unmount();
    window.location.hash = "#/journey";
    const second = render(<App />);
    expect(second.container.textContent).not.toMatch(/New here\?/);
    expect(screen.getByRole("link", { name: "Begin with a one-minute welcome" })).toHaveAttribute("href", "#/welcome");
  });

  it("shows no newcomer banner on the welcome screens or once rated", async () => {
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe("#/welcome"));
    expect(screen.queryByText(/New here\?/)).not.toBeInTheDocument();
    seed();
    window.location.hash = "#/journey";
    const second = render(<App />);
    expect(second.container.textContent).not.toMatch(/New here\?/);
  });

  it("shows a persistent, undismissable alert when saving is off", () => {
    seed();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<App />);
    spy.mockRestore();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Saving is off in this browser. Download a copy before you leave.");
    expect(alert.querySelector("button[class~='notice-btn']")).toHaveTextContent("Download a copy");
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("offers no download button when saving is off and there is no data", () => {
    window.location.hash = "#/assess";
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<App />);
    spy.mockRestore();
    expect(screen.getByRole("alert")).toHaveTextContent("Saving is off in this browser.");
    expect(screen.queryByRole("button", { name: "Download a copy" })).not.toBeInTheDocument();
  });

  it("warns, dismissably, when saved data could not be read", async () => {
    localStorage.setItem(KEYS.quick, JSON.stringify({ 1: 4, 2: 5, 3: 6, 4: 7 }));
    localStorage.setItem(KEYS.checkins, JSON.stringify([{ junk: true }]));
    render(<App />);
    expect(screen.getByText("Some saved data could not be read.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Settings" })).toHaveAttribute("href", "#/settings");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Some saved data could not be read.")).not.toBeInTheDocument();
  });

  it("shows the one-shot notice and lets the person dismiss it", async () => {
    seed();
    setNotice("Restored 2 check-ins.");
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Restored 2 check-ins.");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Restored 2 check-ins.")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("life-improver:notice")).toBeNull();
  });
});

describe("ErrorBoundary", () => {
  function Boom() {
    throw new Error("broken");
  }

  it("shows a calm message with a link to Settings", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary resetKey="/">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("Your data may be damaged. Export or start over in Settings.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute("href", "#/settings");
    spy.mockRestore();
  });

  it("recovers when the route changes", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary resetKey="/">
        <Boom />
      </ErrorBoundary>
    );
    rerender(
      <ErrorBoundary resetKey="/journey">
        <p>fine</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("fine")).toBeInTheDocument();
    spy.mockRestore();
  });
});
