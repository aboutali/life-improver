import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Onboarding from "../Onboarding.jsx";
import { useScores } from "../../hooks/useScores.js";
import { useQuickScores } from "../../hooks/useQuickScores.js";
import { useFocus } from "../../hooks/useFocus.js";
import { useCheckins } from "../../hooks/useCheckins.js";
import { FRAMEWORK } from "../../data/framework.js";

beforeEach(() => sessionStorage.clear());

// Stands in for the router: navigate() changes the path, like a hash change.
function Harness({ navigate: spy = vi.fn(), start = "/welcome" }) {
  const [path, setPath] = useState(start);
  const navigate = (next, opts) => {
    spy(next, opts);
    setPath(next);
  };
  const scores = useScores();
  const quick = useQuickScores();
  const focus = useFocus();
  const checkins = useCheckins();
  return <Onboarding {...{ scores, quick, focus, checkins, navigate, path }} />;
}

const rate = (domain, value) =>
  fireEvent.change(screen.getByLabelText(domain), { target: { value: String(value) } });

async function toStep2() {
  await userEvent.click(screen.getByRole("button", { name: "Begin" }));
}

describe("Onboarding", () => {
  it("starts with the hero: eyebrow, headline, privacy line and Begin", () => {
    render(<Harness />);
    expect(screen.getByText("Life Improver")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Your whole life\.\s*In one view\./ })).toBeInTheDocument();
    expect(screen.getByText("Everything stays on this device.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Begin" })).toBeInTheDocument();
  });

  it("records a slider left at 5 when a key or click lands on it", async () => {
    render(<Harness />);
    await toStep2();
    const sliders = screen.getAllByRole("slider");
    expect(screen.getAllByText("Not rated")).toHaveLength(7);
    // Keyboard: keyup of an arrow key records the resting value.
    fireEvent.keyUp(sliders[0], { key: "ArrowRight" });
    expect(screen.getByText("1 of 7 rated.")).toBeInTheDocument();
    expect(screen.getByLabelText(FRAMEWORK[0].domain)).toHaveValue("5");
    // Other keys do not.
    fireEvent.keyUp(sliders[1], { key: "Tab" });
    expect(screen.getByText("1 of 7 rated.")).toBeInTheDocument();
    ["Home", "End", "PageUp", "PageDown"].forEach((key, i) => fireEvent.keyUp(sliders[i + 1], { key }));
    expect(screen.getByText("5 of 7 rated.")).toBeInTheDocument();
    // Pointer: a click records it too.
    fireEvent.click(sliders[5]);
    expect(screen.getByText("6 of 7 rated.")).toBeInTheDocument();
  });

  it("moves focus into the picker, and back to Choose another when it closes", async () => {
    render(<Harness />);
    await toStep2();
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose another" }));
    expect(screen.getByRole("heading", { name: "Choose where to begin" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Keep the suggestion" }));
    expect(screen.getByRole("button", { name: "Choose another" })).toHaveFocus();
  });

  it("shows seven unset sliders and gates Next on four ratings", async () => {
    render(<Harness />);
    await toStep2();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.getAllByRole("slider")).toHaveLength(7);
    expect(screen.getAllByText("Not rated")).toHaveLength(7);
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();
    FRAMEWORK.slice(0, 3).forEach((d) => rate(d.domain, 6));
    expect(next).toBeDisabled();
    rate(FRAMEWORK[3].domain, 2);
    expect(next).toBeEnabled();
    expect(screen.getByText("4 of 7 rated.")).toBeInTheDocument();
  });

  it("plants the lowest-rated sub and navigates home", async () => {
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await toStep2();
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: FRAMEWORK[2].subs[0].name })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Plant this seed" }));
    expect(JSON.parse(localStorage.getItem("life-improver:quick:v1"))).toEqual({ 1: 8, 2: 7, 3: 2, 4: 6 });
    expect(JSON.parse(localStorage.getItem("life-improver:focus:v1"))).toMatchObject({
      domainId: 3, subIndex: 0, practiceIndex: 0, skipped: [],
    });
    expect(navigate).toHaveBeenCalledWith("/", undefined);
    expect(JSON.parse(localStorage.getItem("life-improver:focus:v1")).origin).toBe("suggested");
    expect(sessionStorage.getItem("life-improver:draft")).toBeNull();
  });

  it("marks a hand-picked focus with origin picked", async () => {
    render(<Harness />);
    await toStep2();
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose another" }));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(FRAMEWORK[2].subs[1].name) }));
    expect(screen.getByText("You chose this place to begin.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Plant this seed" }));
    expect(JSON.parse(localStorage.getItem("life-improver:focus:v1"))).toMatchObject({
      domainId: 3, subIndex: 1, origin: "picked",
    });
  });

  it("lets the person choose another sub", async () => {
    render(<Harness />);
    await toStep2();
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose another" }));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(FRAMEWORK[2].subs[1].name) }));
    expect(screen.getByRole("heading", { name: FRAMEWORK[2].subs[1].name })).toBeInTheDocument();
  });

  it("clears a hand-picked focus when a rating changes", async () => {
    render(<Harness />);
    await toStep2();
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose another" }));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(FRAMEWORK[2].subs[1].name) }));
    expect(screen.getByRole("heading", { name: FRAMEWORK[2].subs[1].name })).toBeInTheDocument();
    // Back, change a rating, forward: the suggestion returns.
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    rate(FRAMEWORK[0].domain, 1);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: FRAMEWORK[0].subs[0].name })).toBeInTheDocument();
  });

  it("keeps a hand-picked focus when no rating changes", async () => {
    render(<Harness />);
    await toStep2();
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose another" }));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(FRAMEWORK[2].subs[1].name) }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: FRAMEWORK[2].subs[1].name })).toBeInTheDocument();
  });

  it("offers a quiet route to the full assessment", async () => {
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await userEvent.click(screen.getByRole("button", { name: "Skip to the full assessment" }));
    expect(navigate).toHaveBeenCalledWith("/assess", undefined);
  });

  it("moves between steps by route, so Back is a navigation", async () => {
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await toStep2();
    expect(navigate).toHaveBeenLastCalledWith("/welcome/rate", undefined);
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(navigate).toHaveBeenLastCalledWith("/welcome/focus", undefined);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenLastCalledWith("/welcome/rate", undefined);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenLastCalledWith("/welcome", undefined);
  });

  it("keeps draft ratings in sessionStorage and restores them on mount", async () => {
    const first = render(<Harness start="/welcome/rate" />);
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    expect(JSON.parse(sessionStorage.getItem("life-improver:draft")).quick).toEqual({ 1: 8, 2: 7, 3: 2, 4: 6 });
    first.unmount();
    render(<Harness start="/welcome/rate" />);
    expect(screen.getByText("4 of 7 rated.")).toBeInTheDocument();
    expect(screen.getByLabelText(FRAMEWORK[2].domain)).toHaveValue("2");
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("sends a direct visit to the last step back to rating when ratings are missing", async () => {
    const navigate = vi.fn();
    render(<Harness navigate={navigate} start="/welcome/focus" />);
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/welcome/rate", { replace: true, quiet: true })
    );
    expect(screen.getByRole("heading", { name: "How does each ground feel?" })).toBeInTheDocument();
  });

  it("shows the last step directly when the draft holds enough ratings", () => {
    sessionStorage.setItem("life-improver:draft", JSON.stringify({ quick: { 1: 8, 2: 7, 3: 2, 4: 6 }, pick: null }));
    render(<Harness start="/welcome/focus" />);
    expect(screen.getByRole("heading", { name: FRAMEWORK[2].subs[0].name })).toBeInTheDocument();
  });

  describe("saved copy", () => {
    const realLocation = window.location;
    let reload, replace;
    beforeEach(() => {
      reload = vi.fn();
      replace = vi.fn();
      Object.defineProperty(window, "location", { configurable: true, value: { ...realLocation, reload, replace } });
    });
    afterEach(() => {
      Object.defineProperty(window, "location", { configurable: true, value: realLocation });
      sessionStorage.clear();
    });

    it("restores a file, leaves a notice, goes to Today and reloads", async () => {
      render(<Harness />);
      const checkin = {
        id: "a", date: "2026-10-01", week: "2026-W40", domainId: 1, subIndex: 0, practiceIndex: 0,
        practised: "yes", score: 6, note: "",
      };
      const payload = {
        app: "life-improver", schema: 2, exportedAt: "2026-10-07T10:00:00.000Z",
        data: { scores: {}, quick: { 1: 6 }, focus: null, checkins: [checkin, { ...checkin, id: "b" }] },
      };
      const file = new File([JSON.stringify(payload)], "backup.json", { type: "application/json" });
      await userEvent.upload(screen.getByLabelText("I have a saved copy"), file);
      await waitFor(() => expect(reload).toHaveBeenCalled());
      expect(replace).toHaveBeenCalledWith("#/");
      expect(sessionStorage.getItem("life-improver:notice")).toBe("Restored 2 check-ins.");
      expect(JSON.parse(localStorage.getItem("life-improver:quick:v1"))).toEqual({ 1: 6 });
    });

    it("shows an error for a bad file and stays put", async () => {
      render(<Harness />);
      const file = new File(["nope"], "bad.json", { type: "application/json" });
      await userEvent.upload(screen.getByLabelText("I have a saved copy"), file);
      expect(await screen.findByRole("alert")).toHaveTextContent(/not valid JSON/i);
      expect(reload).not.toHaveBeenCalled();
    });
  });
});
