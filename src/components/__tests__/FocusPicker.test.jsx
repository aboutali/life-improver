import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FocusPicker from "../FocusPicker.jsx";
import { FRAMEWORK } from "../../data/framework.js";

const hook = (scores = {}) => ({ scores, scoredCount: Object.keys(scores).length });

describe("FocusPicker", () => {
  it("lists three suggestions: lowest full scores, topped up with quick domains", () => {
    render(
      <FocusPicker
        scores={hook({ "1-2": 2 })}
        quickScores={{ 1: 1, 2: 4, 3: 3 }}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const list = within(screen.getByRole("region", { name: "Suggested" }));
    const names = list.getAllByRole("button").map((b) => b.textContent);
    expect(names).toHaveLength(3);
    expect(names[0]).toContain(FRAMEWORK[0].subs[2].name);
    expect(names[1]).toContain(FRAMEWORK[2].subs[0].name);
    expect(names[2]).toContain(FRAMEWORK[1].subs[0].name);
  });

  it("offers all seven domains as disclosure buttons with every sub inside", async () => {
    render(<FocusPicker scores={hook()} quickScores={{ 1: 3 }} onPick={vi.fn()} onClose={vi.fn()} />);
    const all = within(screen.getByRole("region", { name: "All areas" }));
    const groups = all.getAllByRole("button");
    expect(groups).toHaveLength(FRAMEWORK.length);
    groups.forEach((g) => expect(g).toHaveAttribute("aria-expanded", "false"));

    await userEvent.click(all.getByRole("button", { name: FRAMEWORK[3].domain }));
    expect(all.getByRole("button", { name: FRAMEWORK[3].domain })).toHaveAttribute("aria-expanded", "true");
    for (const sub of FRAMEWORK[3].subs) {
      expect(all.getByRole("button", { name: new RegExp(sub.name) })).toBeInTheDocument();
    }
    await userEvent.click(all.getByRole("button", { name: FRAMEWORK[3].domain }));
    expect(all.queryByRole("button", { name: new RegExp(FRAMEWORK[3].subs[0].name) })).not.toBeInTheDocument();
  });

  it("opens the current sub's group and marks the sub", () => {
    render(
      <FocusPicker
        scores={hook()}
        quickScores={{}}
        current={{ domainId: 2, subIndex: 1 }}
        currentLabel="Current"
        onPick={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const all = within(screen.getByRole("region", { name: "All areas" }));
    expect(all.getByRole("button", { name: FRAMEWORK[1].domain })).toHaveAttribute("aria-expanded", "true");
    const marked = all.getByRole("button", { name: new RegExp(FRAMEWORK[1].subs[1].name) });
    expect(marked).toHaveAttribute("aria-current", "true");
    expect(marked).toHaveTextContent("Current");
  });

  it("reports a pick from either part, and closes", async () => {
    const onPick = vi.fn();
    const onClose = vi.fn();
    render(
      <FocusPicker scores={hook({ "1-0": 2 })} quickScores={{}} onPick={onPick} onClose={onClose} closeLabel="Keep this focus" />
    );
    await userEvent.click(
      within(screen.getByRole("region", { name: "Suggested" })).getByRole("button", { name: new RegExp(FRAMEWORK[0].subs[0].name) })
    );
    expect(onPick).toHaveBeenLastCalledWith(1, 0);
    const all = within(screen.getByRole("region", { name: "All areas" }));
    await userEvent.click(all.getByRole("button", { name: FRAMEWORK[4].domain }));
    await userEvent.click(all.getByRole("button", { name: new RegExp(FRAMEWORK[4].subs[1].name) }));
    expect(onPick).toHaveBeenLastCalledWith(FRAMEWORK[4].id, 1);
    await userEvent.click(screen.getByRole("button", { name: "Keep this focus" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("moves focus to its heading when it opens", () => {
    render(<FocusPicker scores={hook()} onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Choose where to begin" })).toHaveFocus();
  });

  it("still lists all areas when nothing is rated", () => {
    render(<FocusPicker scores={hook()} onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole("region", { name: "Suggested" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "All areas" })).toBeInTheDocument();
  });
});
