import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Ideas from "../Ideas.jsx";
import { FRAMEWORK } from "../../data/framework.js";
import { toLocalDate } from "../../lib/dates.js";

const props = (over = {}) => ({
  focus: { focus: null, setFocus: vi.fn(), clearFocus: vi.fn() },
  checkins: { checkins: [] },
  navigate: vi.fn(),
  query: {},
  ...over,
});

describe("Ideas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("has an h2 title", () => {
    render(<Ideas {...props()} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("ways forward.");
  });

  it("preselects the domain and sub from the query", () => {
    const d = FRAMEWORK[2];
    render(<Ideas {...props({ query: { d: String(d.id), s: "1" } })} />);
    expect(screen.getByText(d.subs[1].ideas[0])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: d.subs[1].name })).toHaveClass("a");
  });

  it("opens on the first domain and sub when there is no query and no focus", () => {
    const navigate = vi.fn();
    render(<Ideas {...props({ navigate })} />);
    expect(screen.getByRole("button", { name: FRAMEWORK[0].domain })).toHaveClass("a");
    expect(screen.getByRole("button", { name: FRAMEWORK[0].subs[0].name })).toHaveClass("a");
    expect(screen.getByText(FRAMEWORK[0].subs[0].ideas[0])).toBeInTheDocument();
    expect(screen.queryByText("Pick a domain.")).toBeNull();
    expect(navigate).not.toHaveBeenCalled(); // the default selection does not write the address
  });

  it("opens on the current focus when the query is invalid", () => {
    const d = FRAMEWORK[3];
    const current = { domainId: d.id, subIndex: 1, practiceIndex: 0, startedAt: toLocalDate(), skipped: [] };
    const navigate = vi.fn();
    render(<Ideas {...props({ navigate, query: { d: "99", s: "x" }, focus: { focus: current, setFocus: vi.fn() } })} />);
    expect(screen.getByRole("button", { name: d.domain })).toHaveClass("a");
    expect(screen.getByRole("button", { name: d.subs[1].name })).toHaveClass("a");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("prefers a valid query over the current focus", () => {
    const current = { domainId: FRAMEWORK[3].id, subIndex: 1, practiceIndex: 0, startedAt: toLocalDate(), skipped: [] };
    const d = FRAMEWORK[1];
    render(<Ideas {...props({ query: { d: String(d.id), s: "0" }, focus: { focus: current, setFocus: vi.fn() } })} />);
    expect(screen.getByRole("button", { name: d.domain })).toHaveClass("a");
  });

  it("falls back to sub 0 for a bad sub index", () => {
    const d = FRAMEWORK[0];
    render(<Ideas {...props({ query: { d: String(d.id), s: "99" } })} />);
    expect(screen.getByText(d.subs[0].ideas[0])).toBeInTheDocument();
  });

  it("plants a practice and goes to Today", async () => {
    const p = props({ query: { d: "1", s: "0" } });
    render(<Ideas {...p} />);
    const idea = FRAMEWORK[0].subs[0].ideas[2];
    await userEvent.click(screen.getByRole("button", { name: `Practise this week: ${idea}` }));
    expect(p.focus.setFocus).toHaveBeenCalledWith({
      domainId: 1,
      subIndex: 0,
      practiceIndex: 2,
      startedAt: toLocalDate(),
      skipped: [],
      origin: "practice",
    });
    expect(p.navigate).toHaveBeenCalledWith("/");
  });

  it("shows a This week tag on the current practice instead of the button", () => {
    const current = { domainId: 1, subIndex: 0, practiceIndex: 1, startedAt: toLocalDate(), skipped: [] };
    const p = props({ query: { d: "1", s: "0" }, focus: { focus: current, setFocus: vi.fn() } });
    render(<Ideas {...p} />);
    const idea = FRAMEWORK[0].subs[0].ideas[1];
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Practise this week: ${idea}` })).toBeNull();
    const n = FRAMEWORK[0].subs[0].ideas.length;
    expect(screen.getAllByRole("button", { name: /^Practise this week:/ })).toHaveLength(n - 1);
  });

  it("does not tag the same practice index in another sub", () => {
    const current = { domainId: 1, subIndex: 1, practiceIndex: 1, startedAt: toLocalDate(), skipped: [] };
    render(<Ideas {...props({ query: { d: "1", s: "0" }, focus: { focus: current, setFocus: vi.fn() } })} />);
    expect(screen.queryByText("This week")).toBeNull();
    const row = screen.getByText(FRAMEWORK[0].subs[0].ideas[1]).closest(".ir");
    expect(within(row).getByRole("button")).toBeInTheDocument();
  });

  it("adopting inside the sub already in focus keeps its clock and choices (P2)", async () => {
    const current = {
      domainId: 1, subIndex: 0, practiceIndex: 1, startedAt: "2026-09-01", reviewedAt: "2026-09-29",
      skipped: [3, 4], origin: "suggested", dismissedNudge: { key: "1-1", score: 2 },
    };
    const p = props({ query: { d: "1", s: "0" }, focus: { focus: current, setFocus: vi.fn() } });
    render(<Ideas {...p} />);
    const idea = FRAMEWORK[0].subs[0].ideas[5];
    await userEvent.click(screen.getByRole("button", { name: `Practise this week: ${idea}` }));
    expect(p.focus.setFocus).toHaveBeenCalledWith({ ...current, practiceIndex: 5, skipped: [] });
    expect(p.navigate).toHaveBeenCalledWith("/");
  });

  it("adopting in another sub starts a fresh focus", async () => {
    const current = { domainId: 1, subIndex: 1, practiceIndex: 1, startedAt: "2026-09-01", skipped: [3], origin: "suggested" };
    const p = props({ query: { d: "1", s: "0" }, focus: { focus: current, setFocus: vi.fn() } });
    render(<Ideas {...p} />);
    await userEvent.click(screen.getByRole("button", { name: `Practise this week: ${FRAMEWORK[0].subs[0].ideas[2]}` }));
    expect(p.focus.setFocus).toHaveBeenCalledWith(
      expect.objectContaining({ subIndex: 0, practiceIndex: 2, startedAt: toLocalDate(), skipped: [], origin: "practice" })
    );
  });

  it("a manual pill choice updates the address with a quiet replace (P5)", async () => {
    const p = props({ query: { d: "1", s: "0" } });
    render(<Ideas {...p} />);
    await userEvent.click(screen.getByRole("button", { name: FRAMEWORK[0].subs[1].name }));
    expect(p.navigate).toHaveBeenCalledWith(`/practices?d=${FRAMEWORK[0].id}&s=1`, { replace: true, quiet: true });
    await userEvent.click(screen.getByRole("button", { name: FRAMEWORK[2].domain }));
    expect(p.navigate).toHaveBeenLastCalledWith(`/practices?d=${FRAMEWORK[2].id}&s=0`, { replace: true, quiet: true });
    expect(screen.getByRole("button", { name: FRAMEWORK[2].subs[0].name })).toHaveClass("a");
  });

  it("centres the active pills in their scroller without scrollIntoView (P5)", () => {
    const rect = (left, width) => ({ left, width, right: left + width, top: 0, bottom: 0, height: 0, x: left, y: 0 });
    const original = Element.prototype.getBoundingClientRect;
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    Element.prototype.getBoundingClientRect = function () {
      return this.classList.contains("a") ? rect(500, 100) : this.classList.contains("sh") ? rect(0, 300) : rect(0, 0);
    };
    try {
      const { container } = render(<Ideas {...props({ query: { d: "1", s: "1" } })} />);
      const scrollers = container.querySelectorAll(".sh");
      expect(scrollers).toHaveLength(2);
      for (const box of scrollers) expect(box.scrollLeft).toBe(400);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      Element.prototype.getBoundingClientRect = original;
      delete Element.prototype.scrollIntoView;
    }
  });

  it("links to the framework and the sources (P6)", () => {
    render(<Ideas {...props()} />);
    expect(screen.getByRole("link", { name: "About the framework" })).toHaveAttribute("href", "#/framework");
    expect(screen.getByRole("link", { name: "Sources" })).toHaveAttribute("href", "#/sources");
  });
});
