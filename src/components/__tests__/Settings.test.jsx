import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "../Settings.jsx";
import { KEYS } from "../../lib/storage.js";

const checkin = {
  id: "a", date: "2026-10-01", week: "2026-W40", domainId: 1, subIndex: 0, practiceIndex: 0,
  practised: "yes", score: 6, note: "",
};

// `withData` gives the screen something to lose; without it the account is empty.
function makeProps(withData = false) {
  return {
    scores: { scores: withData ? { "1-0": 4 } : {}, reset: vi.fn() },
    quick: { quick: withData ? { 1: 6 } : {}, reset: vi.fn() },
    focus: { focus: null, clearFocus: vi.fn() },
    checkins: { checkins: withData ? [checkin] : [], reset: vi.fn() },
    navigate: vi.fn(),
  };
}

const realLocation = window.location;
let reload, replace;

beforeEach(() => {
  reload = vi.fn();
  replace = vi.fn();
  sessionStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, reload, replace },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: realLocation });
  vi.restoreAllMocks();
});

describe("Settings", () => {
  it("renders the sections and copy", () => {
    render(<Settings {...makeProps()} />);
    expect(screen.getByRole("heading", { level: 2, name: /settings/i })).toBeInTheDocument();
    for (const name of ["Your data", "Start over", "Privacy", "Not medical advice", "Install the app", "Explore", "About"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.getByText(/reflection, not medical or psychological care/i)).toBeInTheDocument();
    expect(screen.getByText(/no accounts, no server, no tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });

  it("links to Framework and Sources, and carries the attribution in an About card", () => {
    render(<Settings {...makeProps()} />);
    expect(screen.getByRole("link", { name: "Framework" })).toHaveAttribute("href", "#/framework");
    expect(screen.getByRole("link", { name: "Sources" })).toHaveAttribute("href", "#/sources");
    const about = screen.getByRole("region", { name: "About" });
    expect(about).toHaveTextContent(
      "Built on the work of Aristotle, Frankl, Gottman, Maslow, Csikszentmihalyi, and the traditions that came before."
    );
  });

  it("keeps the restore control a real, focusable file input beside muted help text", () => {
    render(<Settings {...makeProps()} />);
    const input = screen.getByLabelText(/restore from a copy/i);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAccessibleDescription("(.json file)");
    input.focus();
    expect(input).toHaveFocus();
  });

  async function blobText(blob) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(blob);
    });
  }

  it("exports a dated JSON file from the state in memory, even with empty storage", async () => {
    const user = userEvent.setup();
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<Settings {...makeProps(true)} />);
    expect(localStorage.getItem(KEYS.scores)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Download a copy" }));
    expect(click).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(await blobText(URL.createObjectURL.mock.calls[0][0]));
    expect(saved.data.scores).toEqual({ "1-0": 4 });
    expect(saved.data.checkins).toHaveLength(1);
  });

  it("offers the damaged copy only when one exists, and bundles it", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Settings {...makeProps()} />);
    expect(screen.queryByRole("button", { name: "Download the damaged copy" })).not.toBeInTheDocument();
    unmount();
    localStorage.setItem(`${KEYS.checkins}:bad`, "{broken");
    localStorage.setItem(`${KEYS.focus}:bad`, '{"x":1}');
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<Settings {...makeProps()} />);
    await user.click(screen.getByRole("button", { name: "Download the damaged copy" }));
    expect(click).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(await blobText(URL.createObjectURL.mock.calls[0][0]));
    expect(saved.copies).toEqual({ [`${KEYS.checkins}:bad`]: "{broken", [`${KEYS.focus}:bad`]: '{"x":1}' });
  });

  it("imports a file after confirmation, leaves a notice, and reloads on Today", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Settings {...makeProps(true)} />);
    const payload = {
      app: "life-improver",
      schema: 2,
      exportedAt: "2026-10-07T10:00:00.000Z",
      data: { scores: { "1-0": 4 }, quick: { 1: 6 }, focus: null, checkins: [] },
    };
    const file = new File([JSON.stringify(payload)], "backup.json", { type: "application/json" });
    await user.upload(screen.getByLabelText(/restore from a copy/i), file);
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalledWith("Replace all data on this device with the imported file?");
    expect(replace).toHaveBeenCalledWith("#/");
    expect(sessionStorage.getItem("life-improver:notice")).toBe("Restored 0 check-ins.");
    expect(JSON.parse(localStorage.getItem(KEYS.scores))).toEqual({ "1-0": 4 });
  });

  it("restores without a confirm dialog when the device holds no data", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Settings {...makeProps()} />);
    const payload = {
      app: "life-improver",
      schema: 2,
      exportedAt: "2026-10-07T10:00:00.000Z",
      data: { scores: {}, quick: { 1: 6 }, focus: null, checkins: [checkin] },
    };
    const file = new File([JSON.stringify(payload)], "backup.json", { type: "application/json" });
    await user.upload(screen.getByLabelText(/restore from a copy/i), file);
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(confirm).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("life-improver:notice")).toBe("Restored 1 check-in.");
  });

  it("shows an inline error for a bad file and does not reload", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Settings {...makeProps()} />);
    const file = new File(["not json"], "bad.json", { type: "application/json" });
    await user.upload(screen.getByLabelText(/restore from a copy/i), file);
    expect(await screen.findByRole("alert")).toHaveTextContent(/not valid JSON/i);
    expect(reload).not.toHaveBeenCalled();
  });

  it("leaves data alone when the import is not confirmed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Settings {...makeProps(true)} />);
    const file = new File(["{}"], "x.json", { type: "application/json" });
    await user.upload(screen.getByLabelText(/restore from a copy/i), file);
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(reload).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resets everything after confirm and goes to the welcome screen", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const props = makeProps();
    render(<Settings {...props} />);
    await user.click(screen.getByRole("button", { name: /reset all data/i }));
    expect(props.scores.reset).toHaveBeenCalled();
    expect(props.quick.reset).toHaveBeenCalled();
    expect(props.focus.clearFocus).toHaveBeenCalled();
    expect(props.checkins.reset).toHaveBeenCalled();
    expect(props.navigate).toHaveBeenCalledWith("/welcome");
  });

  it("does nothing when the reset is declined", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const props = makeProps();
    render(<Settings {...props} />);
    await user.click(screen.getByRole("button", { name: /reset all data/i }));
    expect(props.scores.reset).not.toHaveBeenCalled();
    expect(props.navigate).not.toHaveBeenCalled();
  });

  it("shows an Install button once beforeinstallprompt has fired", async () => {
    const user = userEvent.setup();
    render(<Settings {...makeProps()} />);
    const ev = new Event("beforeinstallprompt", { cancelable: true });
    ev.prompt = vi.fn().mockResolvedValue(undefined);
    ev.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(ev);
    const btn = await screen.findByRole("button", { name: "Install" });
    await user.click(btn);
    expect(ev.prompt).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument());
  });
});
