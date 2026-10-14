import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Sparkline from "../Sparkline.jsx";

describe("Sparkline", () => {
  it("renders nothing for an empty series", () => {
    const { container } = render(<Sparkline series={[]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("says the line starts here for a single point, with no SVG", () => {
    const { container } = render(<Sparkline series={[{ date: "2026-10-07", score: 5 }]} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("Your line starts here.")).toBeInTheDocument();
  });

  it("summarises first and latest score and draws a line", () => {
    const series = [
      { date: "2026-09-23", score: 4 },
      { date: "2026-09-30", score: 5 },
      { date: "2026-10-07", score: 7 },
    ];
    const { container } = render(<Sparkline series={series} label="Sleep" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAccessibleName(/Sleep/);
    expect(img).toHaveAccessibleName(/from 4 on Sep 23 to 7 on Oct 7/);
    expect(container.querySelector("polyline").getAttribute("points").split(" ")).toHaveLength(3);
  });

  it("fills its container and keeps dots round", () => {
    const { container } = render(
      <Sparkline series={[{ date: "2026-10-01", score: 3 }, { date: "2026-10-08", score: 6 }]} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "100%");
    expect(svg).toHaveAttribute("height", "40");
    expect(svg).not.toHaveAttribute("preserveAspectRatio");
    expect(container.querySelectorAll("circle")).toHaveLength(2);
  });

  it("scales 1..10: a higher score sits higher on the chart", () => {
    const { container } = render(
      <Sparkline series={[{ date: "2026-10-01", score: 1 }, { date: "2026-10-08", score: 10 }]} />
    );
    const [lo, hi] = container.querySelector("polyline").getAttribute("points").split(" ").map((p) => Number(p.split(",")[1]));
    expect(hi).toBeLessThan(lo);
  });

  it("fills the area with a gradient from the accent", () => {
    const { container } = render(
      <Sparkline series={[{ date: "2026-10-01", score: 3 }, { date: "2026-10-08", score: 6 }]} />
    );
    const grad = container.querySelector("linearGradient");
    expect(grad).not.toBeNull();
    expect(container.querySelector(".spark-area").getAttribute("style")).toContain(`#${grad.id}`);
  });

  it("detailed adds scale labels, the latest value in a ring and the first and last date", () => {
    const series = [
      { date: "2026-09-23", score: 4 },
      { date: "2026-10-07", score: 7 },
    ];
    const { container } = render(<Sparkline series={series} label="Sleep" detailed />);
    expect(container.querySelector(".spark-ring")).not.toBeNull();
    expect(container.querySelector(".spark-val")).toHaveTextContent("7");
    const scale = [...container.querySelectorAll(".spark-scale")].map((n) => n.textContent);
    expect(scale).toEqual(["10", "1"]);
    expect(container.querySelector(".spark-dates")).toHaveTextContent("Sep 23");
    expect(container.querySelector(".spark-dates")).toHaveTextContent("Oct 7");
    // The accessible description does not change.
    expect(screen.getByRole("img")).toHaveAccessibleName(/from 4 on Sep 23 to 7 on Oct 7/);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});
