import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Sparkline from "../Sparkline.jsx";

describe("Sparkline", () => {
  it("renders nothing for an empty series", () => {
    const { container } = render(<Sparkline series={[]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders a single point as a dot with no line", () => {
    const { container } = render(<Sparkline series={[{ date: "2026-10-07", score: 5 }]} />);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelector("polyline")).toBeNull();
    expect(screen.getByRole("img")).toHaveAccessibleName(/5 out of 10 on Oct 7/);
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
});
