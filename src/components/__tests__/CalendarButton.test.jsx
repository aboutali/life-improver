import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarButton from "../CalendarButton.jsx";
import { downloadIcs } from "../../lib/ics.js";

vi.mock("../../lib/ics.js", async (orig) => ({ ...(await orig()), downloadIcs: vi.fn() }));

// Wednesday 7 October 2026, noon.
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0));
});
afterEach(() => vi.useRealTimers());

describe("CalendarButton", () => {
  it("says when the first one falls, and follows the chosen day", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <CalendarButton label="Add" filename="x.ics" buildIcs={() => "ics"} defaultOpen showTrigger={false}
        defaultDay={0} defaultTime="18:00" minDaysAhead={3} />
    );
    expect(screen.getByText("First one: Sun 11 Oct")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Day"), "1");
    expect(screen.getByText("First one: Mon 12 Oct")).toBeInTheDocument();
  });

  it("hands buildIcs the start date it announced", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const buildIcs = vi.fn(() => "ics");
    render(
      <CalendarButton label="Add" filename="x.ics" buildIcs={buildIcs} defaultOpen showTrigger={false}
        defaultDay={4} defaultTime="07:30" minDaysAhead={1} />
    );
    await user.click(screen.getByRole("button", { name: "Download calendar file" }));
    const start = buildIcs.mock.calls[0][0];
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([8, 7, 30]);
    expect(downloadIcs).toHaveBeenCalledWith("x.ics", "ics");
  });

  it("opens as a dialog titled with its label, downloads, says so, and closes", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CalendarButton label="Add to calendar" filename="x.ics" buildIcs={() => "ics"} />);
    const trigger = screen.getByRole("button", { name: "Add to calendar" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Add to calendar" })).toHaveAttribute("aria-modal", "true");
    await user.click(screen.getByRole("button", { name: "Download calendar file" }));
    expect(downloadIcs).toHaveBeenCalledWith("x.ics", "ics");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(await screen.findByText("Added to calendar", { selector: ".hud-text" })).toBeInTheDocument();
  });

  it("can be driven from outside with open and onClose", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<CalendarButton label="Remind" filename="x.ics" buildIcs={() => "ics"} open onClose={onClose} showTrigger={false} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps old defaults when no minimum is given", () => {
    render(<CalendarButton label="Add" filename="x.ics" buildIcs={() => "ics"} defaultOpen showTrigger={false} />);
    expect(screen.getByLabelText("Day")).toHaveValue("0");
    expect(screen.getByLabelText("Time")).toHaveValue("18:00");
    expect(screen.getByText("First one: Sun 11 Oct")).toBeInTheDocument();
  });
});
