import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Today from "../Today.jsx";
import { useScores } from "../../hooks/useScores.js";
import { useQuickScores } from "../../hooks/useQuickScores.js";
import { useFocus } from "../../hooks/useFocus.js";
import { useCheckins } from "../../hooks/useCheckins.js";
import { toLocalDate, isoWeek } from "../../lib/dates.js";
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
const focusValue = { domainId: 1, subIndex: 0, practiceIndex: 0, startedAt: toLocalDate(), skipped: [] };

describe("Today", () => {
  beforeEach(() => vi.clearAllMocks());

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

  it("downloads a calendar file for the check-in", async () => {
    seed("quick", { 1: 3 });
    seed("focus", focusValue);
    render(<Harness navigate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add a weekly check-in to my calendar" }));
    expect(screen.getByLabelText("Day")).toHaveValue("0");
    expect(screen.getByLabelText("Time")).toHaveValue("18:00");
    await userEvent.click(screen.getByRole("button", { name: "Download calendar file" }));
    expect(downloadIcs).toHaveBeenCalledTimes(1);
    const [name, text] = downloadIcs.mock.calls[0];
    expect(name).toMatch(/\.ics$/);
    expect(text).toContain("RRULE:FREQ=WEEKLY");
    expect(text).toContain("#/checkin");
  });

  it("plants a suggested seed when no focus exists", async () => {
    seed("quick", { 1: 8, 2: 3 });
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: FRAMEWORK[1].subs[0].name })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Plant this seed" }));
    expect(JSON.parse(localStorage.getItem("life-improver:focus:v1"))).toMatchObject({
      domainId: 2, subIndex: 0, practiceIndex: 0, skipped: [],
    });
  });

  it("lets the person choose another sub", async () => {
    seed("quick", { 2: 3 });
    render(<Harness navigate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Choose another" }));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(FRAMEWORK[1].subs[1].name) }));
    expect(JSON.parse(localStorage.getItem("life-improver:focus:v1"))).toMatchObject({ domainId: 2, subIndex: 1 });
  });
});
