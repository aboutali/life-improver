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

function Harness({ navigate }) {
  const scores = useScores();
  const focus = useFocus();
  const checkins = useCheckins();
  return <CheckIn scores={scores} quick={{}} focus={focus} checkins={checkins} navigate={navigate} />;
}

const stored = (key) => JSON.parse(localStorage.getItem(key));

describe("CheckIn", () => {
  it("shows a calm empty state without a focus", async () => {
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await userEvent.click(screen.getByRole("button", { name: "Choose a focus first" }));
    expect(navigate).toHaveBeenCalledWith("/");
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

  it("pre-selects the current score", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    localStorage.setItem(KEYS.scores, JSON.stringify({ "1-0": 4 }));
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByLabelText("4")).toBeChecked();
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
    expect(screen.getByRole("img")).toBeInTheDocument();

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

  it("swaps the practice from the reward view", async () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(FOCUS));
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await userEvent.click(screen.getByLabelText("Not this week"));
    await userEvent.click(screen.getByLabelText("3"));
    await userEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    await userEvent.click(screen.getByRole("button", { name: "Swap practice" }));
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
  });
});
