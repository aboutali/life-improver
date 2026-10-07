import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Journey from "../Journey.jsx";
import { FRAMEWORK } from "../../data/framework.js";

const mk = (date, week, domainId, subIndex, score, extra = {}) => ({
  id: `${date}T10:00:00.000Z`,
  date,
  week,
  domainId,
  subIndex,
  practiceIndex: 0,
  practised: "yes",
  score,
  note: "",
  ...extra,
});

const props = (list, extra = {}) => ({
  scores: { scoredCount: 1 },
  quick: { quick: {} },
  checkins: { checkins: list, addCheckin: () => {}, reset: () => {} },
  ...extra,
});

describe("Journey", () => {
  it("shows an empty state linking to the check-in", () => {
    render(<Journey {...props([])} />);
    expect(screen.getByRole("link", { name: /first check-in/i })).toHaveAttribute("href", "#/checkin");
  });

  it("links a newcomer's empty state to the welcome", () => {
    render(<Journey {...props([], { scores: { scoredCount: 0 } })} />);
    expect(screen.getByRole("link", { name: "Begin with a one-minute welcome" })).toHaveAttribute("href", "#/welcome");
  });

  it("does not treat quick scores as a newcomer", () => {
    render(<Journey {...props([], { scores: { scoredCount: 0 }, quick: { quick: { 1: 5 } } })} />);
    expect(screen.getByRole("link", { name: /first check-in/i })).toHaveAttribute("href", "#/checkin");
  });

  it("shows stats, one row per sub and a newest-first log", () => {
    const list = [
      mk("2026-09-23", "2026-W39", 1, 0, 4),
      mk("2026-09-30", "2026-W40", 1, 0, 6, { practised: "some", note: "Better nights" }),
      mk("2026-10-07", "2026-W41", 2, 0, 5, { practised: "no" }),
    ];
    render(<Journey {...props(list)} />);
    expect(screen.getByText(/3 weeks active · 3 check-ins/)).toBeInTheDocument();

    // Two subs, two sparklines.
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Oct 7, 2026")).toBeInTheDocument();
    expect(within(items[0]).getByText(FRAMEWORK[1].subs[0].name)).toBeInTheDocument();
    expect(within(items[0]).getByText(/Not this week · Score 5/)).toBeInTheDocument();
    expect(within(items[1]).getByText("Better nights")).toBeInTheDocument();
    expect(within(items[1]).getByText(FRAMEWORK[0].subs[0].ideas[0])).toBeInTheDocument();
    expect(within(items[2]).getByText("Sep 23, 2026")).toBeInTheDocument();
  });

  it("uses the accent only for a rise, never red", () => {
    const list = [
      mk("2026-09-23", "2026-W39", 1, 0, 4),
      mk("2026-09-30", "2026-W40", 1, 0, 6),
      mk("2026-09-23", "2026-W39", 1, 1, 6),
      mk("2026-09-30", "2026-W40", 1, 1, 4),
    ];
    render(<Journey {...props(list)} />);
    expect(screen.getByText(/\+2/).closest(".jr-chip")).toHaveClass("up");
    expect(screen.getByText(/−2/).closest(".jr-chip")).not.toHaveClass("up");
  });

  it("formats falling and unchanged scores", () => {
    const list = [
      mk("2026-09-23", "2026-W39", 1, 0, 6),
      mk("2026-09-30", "2026-W40", 1, 0, 5),
      mk("2026-09-23", "2026-W39", 1, 1, 3),
      mk("2026-09-30", "2026-W40", 1, 1, 3),
    ];
    render(<Journey {...props(list)} />);
    expect(screen.getByText(/−1/)).toBeInTheDocument();
    expect(screen.getByText(/±0/)).toBeInTheDocument();
  });

  it("groups the log by week, newest first, and labels later entries", () => {
    const list = [
      mk("2026-09-30", "2026-W40", 1, 0, 4),
      mk("2026-10-05", "2026-W41", 1, 0, 5, { id: "a" }),
      mk("2026-10-07", "2026-W41", 1, 0, 7, { id: "b" }),
    ];
    render(<Journey {...props(list)} />);
    const headings = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual(["Week of Oct 5", "Week of Sep 28"]);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Oct 7, 2026")).toBeInTheDocument();
    expect(within(items[0]).getByText("Added later")).toBeInTheDocument();
    expect(within(items[1]).getByText("Oct 5, 2026")).toBeInTheDocument();
    expect(within(items[1]).queryByText("Added later")).not.toBeInTheDocument();
    expect(screen.getAllByText("Added later")).toHaveLength(1);
  });

  it("uses the latest check-in per week for the row", () => {
    const list = [
      mk("2026-09-30", "2026-W40", 1, 0, 4),
      mk("2026-10-05", "2026-W41", 1, 0, 2, { id: "a" }),
      mk("2026-10-07", "2026-W41", 1, 0, 8, { id: "b" }),
    ];
    render(<Journey {...props(list)} />);
    expect(screen.getByText(/\+4/)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/from 4 on Sep 30 to 8 on Oct 7/);
  });

  it("collapses weeks beyond six behind a toggle", async () => {
    const list = Array.from({ length: 8 }, (_, i) => {
      const day = new Date(2026, 7, 3 + i * 7); // Mondays from Aug 3
      const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      return mk(date, `2026-W${String(32 + i).padStart(2, "0")}`, 1, 0, 3 + (i % 5), { id: `id${i}` });
    });
    render(<Journey {...props(list)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    const button = screen.getByRole("button", { name: "Show earlier weeks" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });

  it("offers no toggle with six weeks or fewer", () => {
    render(<Journey {...props([mk("2026-10-07", "2026-W41", 1, 0, 5)])} />);
    expect(screen.queryByRole("button", { name: "Show earlier weeks" })).not.toBeInTheDocument();
  });
});
