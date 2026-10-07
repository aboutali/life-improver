import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

const props = (list) => ({ checkins: { checkins: list, addCheckin: () => {}, reset: () => {} } });

describe("Journey", () => {
  it("shows an empty state linking to the check-in", () => {
    render(<Journey {...props([])} />);
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
});
