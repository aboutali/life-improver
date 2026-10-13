import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";

describe("EmptyState", () => {
  it("shows a decorative icon, a title, one sentence and one action", () => {
    const { container } = render(
      <EmptyState icon="journey" title="Your line is waiting" action={<a href="#/checkin" className="btn">Go</a>}>
        Nothing here yet.
      </EmptyState>
    );
    const svg = container.querySelector(".empty-ic svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "40");
    expect(screen.getByRole("heading", { level: 3, name: "Your line is waiting" })).toHaveClass("t-title");
    expect(screen.getByText("Nothing here yet.")).toHaveClass("t-sub");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("the error boundary uses it, with an alert and one link to Settings", () => {
    const Boom = () => {
      throw new Error("boom");
    };
    const spy = console.error;
    console.error = () => {};
    try {
      render(<ErrorBoundary resetKey="/"><Boom /></ErrorBoundary>);
    } finally {
      console.error = spy;
    }
    expect(screen.getByRole("alert")).toHaveClass("empty");
    expect(screen.getByRole("heading", { level: 2, name: "Something went astray" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Settings" })).toHaveAttribute("href", "#/settings");
  });
});
