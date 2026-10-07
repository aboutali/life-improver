import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import App from "../App.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import { KEYS } from "../lib/storage.js";

// Setting the hash queues a hashchange; let it fire before the test mounts anything.
beforeEach(async () => {
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
    expect(screen.getByRole("heading", { level: 2, name: "Your whole life. In one view." })).toBeInTheDocument();
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
