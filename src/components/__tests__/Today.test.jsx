import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Today from "../Today.jsx";
import { useScores } from "../../hooks/useScores.js";
import { useQuickScores } from "../../hooks/useQuickScores.js";
import { useFocus } from "../../hooks/useFocus.js";
import { useCheckins } from "../../hooks/useCheckins.js";
import { toLocalDate, isoWeek } from "../../lib/dates.js";
import { addDays } from "../../lib/rhythm.js";
import { FRAMEWORK } from "../../data/framework.js";
import { downloadIcs } from "../../lib/ics.js";

vi.mock("../../lib/ics.js", async (orig) => ({
  ...(await orig()),
  downloadIcs: vi.fn(),
}));

function Harness({ navigate }) {
  const scores = useScores();
  const quick = useQuickScores();
  const focus = useFocus();
  const checkins = useCheckins();
  return <Today {...{ scores, quick, focus, checkins, navigate }} />;
}

const seed = (key, value) => localStorage.setItem(`life-improver:${key}:v1`, JSON.stringify(value));
const todayStr = toLocalDate();
// Planted four days ago, so the first check-in is open.
const focusValue = { domainId: 1, subIndex: 0, practiceIndex: 0, startedAt: addDays(todayStr, -4), skipped: [] };
const ck = (date, over = {}) => ({
  id: `c-${date}`, date, week: isoWeek(date), domainId: 1, subIndex: 0,
  practiceIndex: 0, practised: "yes", score: 6, note: "", ...over,
});

describe("Today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows the focus card with the greeting and garden", () => {
    seed("quick", { 1: 3, 2: 6 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 2, name: "This week, tend one thing." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: FRAMEWORK[0].subs[0].name })).toBeInTheDocument();
    expect(screen.getByText(FRAMEWORK[0].subs[0].ideas[0])).toBeInTheDocument();
    expect(screen.getByText("From your quick scores.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Refine with the full assessment" })).toHaveAttribute("href", "#/assess");
  });

  it("swaps the practice", async () => {
    seed("quick", { 1: 3 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Swap practice" }));
    expect(screen.getByText(FRAMEWORK[0].subs[0].ideas[1])).toBeInTheDocument();
  });

  it("offers Check in until one exists this week", async () => {
    seed("quick", { 1: 3 });
    seed("focus", focusValue);
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await userEvent.click(screen.getByRole("button", { name: "Check in" }));
    expect(navigate).toHaveBeenCalledWith("/checkin");
  });

  it("shows a calm confirmation after a check-in", () => {
    seed("quick", { 1: 3 });
    seed("focus", focusValue);
    seed("checkins", [{
      id: "x", date: toLocalDate(), week: isoWeek(), domainId: 1, subIndex: 0,
      practiceIndex: 0, practised: "yes", score: 7, note: "",
    }]);
    render(<Harness navigate={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Check in" })).not.toBeInTheDocument();
    expect(screen.getByText("Checked in this week")).toBeInTheDocument();
    expect(screen.getByText(/You rated it 7\/10/)).toBeInTheDocument();
  });

  it("reveals the weekly reminder and downloads a calendar file", async () => {
    seed("quick", { 1: 3 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    expect(screen.queryByLabelText("Day")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remind me weekly" }));
    expect(screen.getByLabelText("Day")).toHaveValue("0");
    expect(screen.getByLabelText("Time")).toHaveValue("18:00");
    await userEvent.click(screen.getByRole("button", { name: "Download calendar file" }));
    expect(downloadIcs).toHaveBeenCalledTimes(1);
    const [name, text] = downloadIcs.mock.calls[0];
    expect(name).toMatch(/\.ics$/);
    expect(text).toContain("RRULE:FREQ=WEEKLY");
    expect(text).toContain("#/checkin");
  });

  it("keeps to three cards: focus, check-in, garden", () => {
    seed("quick", { 1: 3 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    expect(screen.queryByText("A weekly pause")).not.toBeInTheDocument();
    expect(screen.getByText(/Your practice this week/)).toBeInTheDocument();
    for (const name of ["Swap practice", "Add to calendar", "Choose another focus"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("offers a calendar file for the practice", async () => {
    seed("quick", { 1: 3 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
    await userEvent.click(screen.getByRole("button", { name: "Download calendar file" }));
    expect(downloadIcs).toHaveBeenCalledTimes(1);
  });

  it("chooses another focus, moving focus into the picker and back out", async () => {
    seed("quick", { 1: 4, 2: 3 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Choose another focus" });
    await userEvent.click(trigger);
    expect(screen.getByRole("heading", { name: "Choose where to begin" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Keep this focus" }));
    expect(screen.queryByRole("heading", { name: "Choose where to begin" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: FRAMEWORK[1].domain }));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(FRAMEWORK[1].subs[1].name) }));
    expect(JSON.parse(localStorage.getItem("life-improver:focus:v1"))).toMatchObject({
      domainId: 2, subIndex: 1, practiceIndex: 0, skipped: [], origin: "picked",
    });
    expect(screen.getByRole("button", { name: "Choose another focus" })).toHaveFocus();
  });

  it("shows garden values with one decimal, a quick tag and the focus row", () => {
    seed("quick", { 1: 3, 2: 7 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByText("7.0", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText("quick")).toHaveLength(2);
    expect(screen.getByText(/this week.s focus/)).toBeInTheDocument();
    expect(screen.getAllByText("not rated", { exact: false }).length).toBe(5);
  });

  it("plants a suggested seed when no focus exists", async () => {
    seed("quick", { 1: 8, 2: 3 });
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: FRAMEWORK[1].subs[0].name })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Plant this seed" }));
    expect(JSON.parse(localStorage.getItem("life-improver:focus:v1"))).toMatchObject({
      domainId: 2, subIndex: 0, practiceIndex: 0, skipped: [], origin: "suggested",
    });
  });

  it("lets the person choose another sub", async () => {
    seed("quick", { 2: 3 });
    render(<Harness navigate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Choose another" }));
    // The suggested sub's group starts open, so its other subs are in reach.
    await userEvent.click(screen.getByRole("button", { name: new RegExp(FRAMEWORK[1].subs[1].name) }));
    expect(JSON.parse(localStorage.getItem("life-improver:focus:v1"))).toMatchObject({
      domainId: 2, subIndex: 1, origin: "picked",
    });
  });
  describe("check-in gating (R1)", () => {
    it("holds the first check-in until three days after the focus began", async () => {
      seed("quick", { 1: 3 });
      seed("focus", { ...focusValue, startedAt: todayStr });
      const navigate = vi.fn();
      render(<Harness navigate={navigate} />);
      expect(screen.queryByRole("button", { name: "Check in" })).not.toBeInTheDocument();
      expect(screen.getByText(/Your first check-in opens [A-Z][a-z]+day\./)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("link", { name: "Check in early" }));
      expect(navigate).toHaveBeenCalledWith("/checkin");
    });

    it("opens on the third day", () => {
      seed("quick", { 1: 3 });
      seed("focus", { ...focusValue, startedAt: addDays(todayStr, -3) });
      render(<Harness navigate={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Check in" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Check in early" })).not.toBeInTheDocument();
    });
  });

  describe("reason line (F6)", () => {
    it("keeps how the focus was chosen", () => {
      seed("quick", { 1: 3 });
      seed("focus", { ...focusValue, origin: "picked" });
      render(<Harness navigate={vi.fn()} />);
      expect(screen.getByText("You chose this place to begin.")).toBeInTheDocument();
    });

    it("reads the score for a suggested focus", () => {
      seed("quick", { 1: 3 });
      seed("focus", { ...focusValue, origin: "suggested" });
      render(<Harness navigate={vi.fn()} />);
      expect(screen.getByText(/You rated .* 3\/10\./)).toBeInTheDocument();
    });
  });

  describe("lower sub nudge (F5)", () => {
    const low = { "1-0": 6, "1-1": 3 };

    it("offers to switch, and plants the lower sub", async () => {
      seed("scores", low);
      seed("focus", focusValue);
      render(<Harness navigate={vi.fn()} />);
      expect(
        screen.getByText(`${FRAMEWORK[0].subs[1].name} is now your lowest (3/10). Switch your focus?`)
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Switch" }));
      expect(JSON.parse(localStorage.getItem("life-improver:focus:v1"))).toMatchObject({
        domainId: 1, subIndex: 1, origin: "picked", startedAt: todayStr,
      });
      expect(screen.queryByRole("button", { name: "Switch" })).not.toBeInTheDocument();
    });

    it("hides after Not now, until the score changes", async () => {
      seed("scores", low);
      seed("focus", focusValue);
      const { unmount } = render(<Harness navigate={vi.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: "Not now" }));
      expect(screen.queryByRole("button", { name: "Switch" })).not.toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem("life-improver:focus:v1")).dismissedNudge).toEqual({
        key: "1-1", score: 3,
      });
      unmount();
      render(<Harness navigate={vi.fn()} />);
      expect(screen.queryByRole("button", { name: "Switch" })).not.toBeInTheDocument();
    });

    it("returns when the dismissed sub is scored differently", () => {
      seed("scores", { "1-0": 6, "1-1": 2 });
      seed("focus", { ...focusValue, dismissedNudge: { key: "1-1", score: 3 } });
      render(<Harness navigate={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Switch" })).toBeInTheDocument();
    });
  });

  describe("season (R6)", () => {
    const four = [8, 15, 22, 29].map((n) => ck(addDays(todayStr, -n)));
    const started = addDays(todayStr, -35);

    it("asks after four check-ins; Stay records a review", async () => {
      seed("quick", { 1: 3 });
      seed("focus", { ...focusValue, startedAt: started });
      seed("checkins", four.slice().reverse());
      render(<Harness navigate={vi.fn()} />);
      expect(
        screen.getByText(`Four weeks with ${FRAMEWORK[0].subs[0].name}. Stay for another season, or choose a new focus?`)
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: `Stay with ${FRAMEWORK[0].subs[0].name}` }));
      expect(JSON.parse(localStorage.getItem("life-improver:focus:v1")).reviewedAt).toBe(todayStr);
      expect(screen.queryByRole("button", { name: `Stay with ${FRAMEWORK[0].subs[0].name}` })).not.toBeInTheDocument();
    });

    it("Choose a new focus opens the picker", async () => {
      seed("quick", { 1: 3 });
      seed("focus", { ...focusValue, startedAt: started });
      seed("checkins", four.slice().reverse());
      render(<Harness navigate={vi.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: "Choose a new focus" }));
      expect(screen.getByRole("heading", { name: "Choose where to begin" })).toBeInTheDocument();
    });

    it("shows the season card before the nudge, never both", () => {
      seed("scores", { "1-0": 6, "1-1": 2 });
      seed("focus", { ...focusValue, startedAt: started });
      seed("checkins", four.slice().reverse());
      render(<Harness navigate={vi.fn()} />);
      expect(screen.getByRole("button", { name: `Stay with ${FRAMEWORK[0].subs[0].name}` })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Switch" })).not.toBeInTheDocument();
    });
  });

  describe("welcome back (R7)", () => {
    const stale = [ck(addDays(todayStr, -21))];

    it("greets after a long gap and hides for the visit on Pick up", async () => {
      seed("quick", { 1: 3 });
      seed("focus", focusValue);
      seed("checkins", stale);
      const { unmount } = render(<Harness navigate={vi.fn()} />);
      expect(screen.getByText("Welcome back. It has been 3 weeks.")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Pick up this practice" }));
      expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
      unmount();
      render(<Harness navigate={vi.fn()} />);
      expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
    });

    it("Start fresh opens the picker", async () => {
      seed("quick", { 1: 3 });
      seed("focus", focusValue);
      seed("checkins", stale);
      render(<Harness navigate={vi.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: "Start fresh" }));
      expect(screen.getByRole("heading", { name: "Choose where to begin" })).toBeInTheDocument();
      expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
    });

    it("stays away when the last check-in is recent or there are none", () => {
      seed("quick", { 1: 3 });
      seed("focus", focusValue);
      render(<Harness navigate={vi.fn()} />);
      expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
    });

    it("comes first on the page", () => {
      seed("quick", { 1: 3 });
      seed("focus", focusValue);
      seed("checkins", stale);
      render(<Harness navigate={vi.fn()} />);
      const wb = screen.getByText(/Welcome back/);
      const fc = screen.getByText(/Your practice this week/);
      expect(wb.compareDocumentPosition(fc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it("shows when the first calendar events fall", async () => {
    seed("quick", { 1: 3 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
    expect(screen.getByText(/^First one: \w{3} \d{1,2} \w{3}$/)).toBeInTheDocument();
    expect(screen.getByLabelText("Time")).toHaveValue("07:30");
  });
});
