import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckIn from "../CheckIn.jsx";
import { useScores } from "../../hooks/useScores.js";
import { useFocus } from "../../hooks/useFocus.js";
import { useCheckins } from "../../hooks/useCheckins.js";
import { FRAMEWORK } from "../../data/framework.js";
import { KEYS } from "../../lib/storage.js";
import { toLocalDate, isoWeek } from "../../lib/dates.js";

const FOCUS = { domainId: 1, subIndex: 0, practiceIndex: 3, startedAt: "2026-10-01", skipped: [] };
const SUB = FRAMEWORK[0].subs[0];

function Harness({ navigate, quick = {} }) {
  const scores = useScores();
  const focus = useFocus();
  const checkins = useCheckins();
  return <CheckIn scores={scores} quick={{ quick }} focus={focus} checkins={checkins} navigate={navigate} />;
}

const stored = (key) => JSON.parse(localStorage.getItem(key));

describe("CheckIn", () => {
  it("links an empty state to Today for someone with ratings", () => {
    localStorage.setItem(KEYS.scores, JSON.stringify({ "1-0": 4 }));
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Choose a focus first" })).toHaveAttribute("href", "#/");
  });

  it("links an empty state to the welcome for a newcomer", () => {
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Begin with a one-minute welcome" })).toHaveAttribute("href", "#/welcome");
    expect(screen.getByText("There is nothing to check in on yet. A one-minute welcome sets your first focus.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Choose a focus first" })).not.toBeInTheDocument();
  });

  it("treats quick scores as not being a newcomer", () => {
    render(<Harness navigate={vi.fn()} quick={{ 1: 5 }} />);
    expect(screen.getByRole("link", { name: "Choose a focus first" })).toHaveAttribute("href", "#/");
  });

  it("shows the focus and disables save until both questions are answered", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByText(SUB.name)).toBeInTheDocument();
    expect(screen.getByText(SUB.ideas[3])).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save check-in" });
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Yes"));
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByLabelText("6"));
    expect(save).toBeEnabled();
  });

  it("explains the disabled save button until both questions are answered", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    render(<Harness navigate={vi.fn()} />);
    const save = screen.getByRole("button", { name: "Save check-in" });
    const hint = screen.getByText("Answer the first two questions to save.");
    expect(save).toHaveAccessibleDescription("Answer the first two questions to save.");
    expect(hint).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Yes"));
    await userEvent.click(screen.getByLabelText("6"));
    expect(screen.queryByText("Answer the first two questions to save.")).not.toBeInTheDocument();
    expect(save).not.toHaveAttribute("aria-describedby");
  });

  it("moves focus to the reward heading after saving", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    render(<Harness navigate={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Yes"));
    await userEvent.click(screen.getByLabelText("6"));
    await userEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(screen.getByRole("heading", { name: "Check-in saved" })).toHaveFocus();
  });

  it("falls back to the first practice when the stored index is out of range", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify({ ...FOCUS, practiceIndex: 999 }));
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByText(SUB.ideas[0])).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Yes"));
    await userEvent.click(screen.getByLabelText("6"));
    await userEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(stored(KEYS.checkins)[0].practiceIndex).toBe(0);
  });

  it("shows the empty state when the focus points to a missing domain or sub", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify({ ...FOCUS, domainId: 999 }));
    const { unmount } = render(<Harness navigate={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Begin with a one-minute welcome" })).toBeInTheDocument();
    unmount();
    localStorage.setItem(KEYS.focus, JSON.stringify({ ...FOCUS, subIndex: 99 }));
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Begin with a one-minute welcome" })).toBeInTheDocument();
  });

  it("derives the week from the same date it saves", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(2026, 11, 31, 12, 0)); // Thursday, ISO week 53 of 2026
      localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
      render(<Harness navigate={vi.fn()} />);
      await userEvent.click(screen.getByLabelText("Yes"));
      await userEvent.click(screen.getByLabelText("6"));
      await userEvent.click(screen.getByRole("button", { name: "Save check-in" }));
      expect(stored(KEYS.checkins)[0]).toMatchObject({ date: "2026-12-31", week: isoWeek("2026-12-31") });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not pre-select a score, and hints at the last one", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    localStorage.setItem(KEYS.scores, JSON.stringify({ "1-0": 4 }));
    render(<Harness navigate={vi.fn()} />);
    for (let n = 1; n <= 10; n++) expect(screen.getByLabelText(String(n))).not.toBeChecked();
    expect(screen.getByText("Last time: 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save check-in" })).toBeDisabled();
  });

  it("falls back to the latest check-in for the hint, and shows none without one", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    const { unmount } = render(<Harness navigate={vi.fn()} />);
    expect(screen.queryByText(/Last time/)).not.toBeInTheDocument();
    unmount();
    localStorage.setItem(
      KEYS.checkins,
      JSON.stringify([{ id: "2026-09-01T10:00:00.000Z", date: "2026-09-01", week: "2026-W36", domainId: 1, subIndex: 0, practiceIndex: 1, practised: "yes", score: 5, note: "" }])
    );
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByText("Last time: 5")).toBeInTheDocument();
  });

  it("gives the note field the visible focus outline class", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByLabelText(/A note/)).toHaveClass("ci-note");
  });

  it("counts the note and caps it at 500 characters", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    render(<Harness navigate={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/A note/), "hello");
    expect(screen.getByText("5/500")).toBeInTheDocument();
    expect(screen.getByLabelText(/A note/)).toHaveAttribute("maxlength", "500");
  });

  it("saves the check-in, writes the score and shows the reward", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await userEvent.click(screen.getByLabelText("Some"));
    await userEvent.click(screen.getByLabelText("7"));
    await userEvent.type(screen.getByLabelText(/A note/), "Slow start");
    await userEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(screen.getByText(/^Next check-in: Sun \d{1,2} [A-Z][a-z]{2}$/)).toBeInTheDocument();
    expect(screen.getByText("Your line starts here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try a different practice" })).toBeInTheDocument();

    const saved = stored(KEYS.checkins);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      date: toLocalDate(),
      week: isoWeek(),
      domainId: 1,
      subIndex: 0,
      practiceIndex: 3,
      practised: "some",
      score: 7,
      note: "Slow start",
    });
    expect(stored(KEYS.scores)["1-0"]).toBe(7);

    expect(screen.getByText(/A first mark on the page/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Keep this practice" }));
    expect(navigate).toHaveBeenCalledWith("/");
    expect(stored(KEYS.focus).practiceIndex).toBe(3);
  });

  it("shows the change since the first check-in", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    localStorage.setItem(
      KEYS.checkins,
      JSON.stringify([{ id: "2026-09-01T10:00:00.000Z", date: "2026-09-01", week: "2026-W36", domainId: 1, subIndex: 0, practiceIndex: 1, practised: "yes", score: 4, note: "" }])
    );
    render(<Harness navigate={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Yes"));
    await userEvent.click(screen.getByLabelText("6"));
    await userEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(screen.getByText("+2 since your first check-in")).toBeInTheDocument();
    expect(screen.getByText(/Higher than where you began/)).toBeInTheDocument();
  });

  it("offers a smaller practice after a week without it", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await userEvent.click(screen.getByLabelText("Not this week"));
    await userEvent.click(screen.getByLabelText("3"));
    await userEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(screen.getByText("A week without it happens. Smaller is fine.")).toBeInTheDocument();
    expect(screen.queryByText(/A first mark on the page/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try a different practice" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try a smaller practice" }));
    const next = stored(KEYS.focus);
    expect(next.practiceIndex).not.toBe(3);
    expect(next.skipped).toContain(3);
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("notes an earlier check-in this week but still allows another", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    localStorage.setItem(
      KEYS.checkins,
      JSON.stringify([{ id: new Date().toISOString(), date: toLocalDate(), week: isoWeek(), domainId: 1, subIndex: 0, practiceIndex: 3, practised: "yes", score: 5, note: "" }])
    );
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByText("You already checked in this week. A new entry adds to it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save check-in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Today" })).toHaveAttribute("href", "#/");
  });

  it("says so when the check-in is early, and not once it has opened", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify({ ...FOCUS, startedAt: toLocalDate() }));
    const early = render(<Harness navigate={vi.fn()} />);
    expect(screen.getByText("You started recently. Check in early only if you like.")).toBeInTheDocument();
    early.unmount();
    localStorage.setItem(KEYS.focus, JSON.stringify({ ...FOCUS, startedAt: "2020-01-01" }));
    render(<Harness navigate={vi.fn()} />);
    expect(screen.queryByText(/You started recently/)).not.toBeInTheDocument();
  });
});
