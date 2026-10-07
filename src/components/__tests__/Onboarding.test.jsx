import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Onboarding from "../Onboarding.jsx";
import { useScores } from "../../hooks/useScores.js";
import { useQuickScores } from "../../hooks/useQuickScores.js";
import { useFocus } from "../../hooks/useFocus.js";
import { useCheckins } from "../../hooks/useCheckins.js";
import { FRAMEWORK } from "../../data/framework.js";

function Harness({ navigate }) {
  const scores = useScores();
  const quick = useQuickScores();
  const focus = useFocus();
  const checkins = useCheckins();
  return <Onboarding {...{ scores, quick, focus, checkins, navigate }} />;
}

const rate = (domain, value) =>
  fireEvent.change(screen.getByLabelText(domain), { target: { value: String(value) } });

async function toStep2() {
  await userEvent.click(screen.getByRole("button", { name: "Begin" }));
}

describe("Onboarding", () => {
  it("starts with intro, privacy line and step indicator", () => {
    render(<Harness navigate={vi.fn()} />);
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Everything stays on this device.")).toBeInTheDocument();
  });

  it("shows seven unset sliders and gates Next on four ratings", async () => {
    render(<Harness navigate={vi.fn()} />);
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
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("lets the person choose another sub", async () => {
    render(<Harness navigate={vi.fn()} />);
    await toStep2();
    [8, 7, 2, 6].forEach((v, i) => rate(FRAMEWORK[i].domain, v));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose another" }));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(FRAMEWORK[2].subs[1].name) }));
    expect(screen.getByRole("heading", { name: FRAMEWORK[2].subs[1].name })).toBeInTheDocument();
  });

  it("offers a quiet route to the full assessment", async () => {
    const navigate = vi.fn();
    render(<Harness navigate={navigate} />);
    await userEvent.click(screen.getByRole("button", { name: "Skip to the full assessment" }));
    expect(navigate).toHaveBeenCalledWith("/assess");
  });
});
