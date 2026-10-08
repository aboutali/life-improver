import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelfAssessment from "../SelfAssessment.jsx";
import Overview from "../Overview.jsx";
import Sources from "../Sources.jsx";
import { FRAMEWORK } from "../../data/framework.js";
import { toLocalDate } from "../../lib/dates.js";

function scoresStub(map) {
  return {
    scores: map,
    scoredCount: Object.keys(map).length,
    get: (d, s) => map[`${d}-${s}`],
    set: vi.fn(),
    reset: vi.fn(),
  };
}

const lowMap = { "1-0": 2, "1-1": 3, "2-0": 4, "3-0": 9 };

function setup(focusValue = null) {
  const focus = { focus: focusValue, setFocus: vi.fn() };
  const navigate = vi.fn();
  render(<SelfAssessment scores={scoresStub(lowMap)} focus={focus} checkins={{ checkins: [] }} navigate={navigate} />);
  return { focus, navigate };
}

describe("SelfAssessment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("has an h2 title", () => {
    setup();
    expect(screen.getByRole("heading", { level: 2, name: "How are you, really?" })).toBeInTheDocument();
  });

  it("sends the person to Today from the dashboard", async () => {
    const { navigate } = setup();
    await userEvent.click(screen.getByRole("button", { name: "See this week's focus" }));
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("makes a low sub the focus with origin picked", async () => {
    const { focus, navigate } = setup();
    const name = FRAMEWORK[0].subs[0].name;
    await userEvent.click(screen.getByRole("button", { name: `Make this my focus: ${name}` }));
    expect(focus.setFocus).toHaveBeenCalledWith(
      expect.objectContaining({ domainId: 1, subIndex: 0, origin: "picked", startedAt: toLocalDate(), skipped: [] })
    );
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("hides the button on the row that is already the focus", () => {
    setup({ domainId: 1, subIndex: 0, practiceIndex: 0, startedAt: toLocalDate(), skipped: [] });
    expect(screen.queryByRole("button", { name: `Make this my focus: ${FRAMEWORK[0].subs[0].name}` })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Make this my focus/ })).toHaveLength(2);
  });
});

describe("SelfAssessment default domain", () => {
  const renderWith = (map, focusValue = null) =>
    render(
      <SelfAssessment
        scores={scoresStub(map)}
        focus={{ focus: focusValue, setFocus: vi.fn() }}
        checkins={{ checkins: [] }}
        navigate={vi.fn()}
      />
    );
  const active = () => document.querySelector(".dp.a");

  it("opens on the focus domain", () => {
    const d = FRAMEWORK[3];
    renderWith(lowMap, { domainId: d.id, subIndex: 0, practiceIndex: 0, startedAt: toLocalDate(), skipped: [] });
    expect(active()).toHaveTextContent(d.domain);
    expect(screen.getByRole("slider", { name: `${d.subs[0].name} score` })).toBeInTheDocument();
  });

  it("without a focus, opens on the first domain that has an unrated sub", () => {
    const full = Object.fromEntries(FRAMEWORK[0].subs.map((_, si) => [`${FRAMEWORK[0].id}-${si}`, 5]));
    renderWith(full);
    expect(active()).toHaveTextContent(FRAMEWORK[1].domain);
  });

  it("with everything rated and no focus, opens on the first domain", () => {
    const all = {};
    for (const d of FRAMEWORK) d.subs.forEach((_, si) => (all[`${d.id}-${si}`] = 5));
    renderWith(all);
    expect(active()).toHaveTextContent(FRAMEWORK[0].domain);
  });

  it("shows no empty-state card", () => {
    renderWith({});
    expect(screen.queryByText("Pick a domain to start.")).toBeNull();
    expect(active()).toHaveTextContent(FRAMEWORK[0].domain);
  });
});

describe("Overview", () => {
  it("has an h2 title and accordion buttons", async () => {
    render(<Overview />);
    expect(screen.getByRole("heading", { level: 2, name: "The seven dimensions." })).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: new RegExp(FRAMEWORK[0].domain) });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    const region = document.getElementById(btn.getAttribute("aria-controls"));
    expect(region).not.toBeNull();
    expect(within(region).getByRole("link", { name: FRAMEWORK[0].subs[1].name })).toHaveAttribute(
      "href",
      `#/practices?d=${FRAMEWORK[0].id}&s=1`
    );
  });
});

describe("Sources", () => {
  it("has an h2 title and a link to the practices", () => {
    render(<Sources />);
    expect(screen.getByRole("heading", { level: 2, name: "The thinking behind it." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse the practices" })).toHaveAttribute("href", "#/practices");
  });
});
