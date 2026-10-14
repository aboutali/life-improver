import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sheet from "../Sheet.jsx";
import { confirmAction } from "../confirmAction.jsx";
import { showHud } from "../showHud.jsx";
import { HUD_MS, dismissHud } from "../../lib/hud.js";

function Harness({ onClose = vi.fn(), start = true }) {
  const [open, setOpen] = useState(start);
  return (
    <div id="root">
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <Sheet open={open} title="Pick a day" onClose={() => { onClose(); setOpen(false); }}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Sheet>
    </div>
  );
}

afterEach(() => {
  document.documentElement.classList.remove("sheet-open");
});

describe("Sheet", () => {
  it("is a modal dialog named by its title, with a grabber and a close button", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog", { name: "Pick a day" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.querySelector(".sheet-grab")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pick a day" })).toHaveFocus();
  });

  it("makes the page behind inert while open and frees it afterwards", () => {
    const holder = document.createElement("div");
    holder.id = "root";
    document.body.appendChild(holder);
    const { unmount } = render(<Sheet open title="Hello" onClose={() => {}}><p>Body</p></Sheet>, { container: holder });
    expect(holder).toHaveAttribute("inert");
    expect(holder).toHaveAttribute("aria-hidden", "true");
    expect(document.documentElement).toHaveClass("sheet-open");
    unmount();
    expect(holder).not.toHaveAttribute("inert");
    expect(holder).not.toHaveAttribute("aria-hidden");
    holder.remove();
  });

  it("releases the page and returns focus to the opener when closed", async () => {
    const user = userEvent.setup();
    render(<Harness start={false} />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.documentElement).not.toHaveClass("sheet-open");
  });

  it("closes on Escape and on a tap on the backdrop", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} start={false} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(document.querySelector(".sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab inside the sheet, wrapping at both ends", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const close = screen.getByRole("button", { name: "Close" });
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    await user.tab(); // from the heading
    expect(close).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab();
    expect(second).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(second).toHaveFocus();
  });

  it("pulls focus back when it strays outside", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    // The page behind is hidden from the accessibility tree, so reach it by selector.
    document.querySelector("#root > button").focus();
    expect(dialog).toHaveFocus();
  });

  it("ignores the keyboard when it is not the top layer", async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    render(
      <>
        <Sheet open title="Outer" onClose={outer}><p>Outer body</p></Sheet>
        <Sheet open title="Inner" onClose={() => {}}><p>Inner body</p></Sheet>
      </>
    );
    await user.keyboard("{Escape}");
    expect(outer).not.toHaveBeenCalled();
  });
});

describe("confirmAction", () => {
  it("resolves true on the action, with a destructive style when asked", async () => {
    const user = userEvent.setup();
    const answer = confirmAction({ title: "Erase it?", message: "Gone for good.", confirmLabel: "Erase", destructive: true });
    const dialog = await screen.findByRole("dialog", { name: "Erase it?" });
    expect(dialog).toHaveAccessibleDescription("Gone for good.");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    const erase = screen.getByRole("button", { name: "Erase" });
    expect(erase).toHaveClass("is-destructive");
    await user.click(erase);
    await expect(answer).resolves.toBe(true);
  });

  it("resolves false on Cancel, Escape and the backdrop", async () => {
    const user = userEvent.setup();
    let answer = confirmAction({ title: "Sure?", confirmLabel: "Yes" });
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await expect(answer).resolves.toBe(false);

    answer = confirmAction({ title: "Sure?", confirmLabel: "Yes" });
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await expect(answer).resolves.toBe(false);

    answer = confirmAction({ title: "Sure?", confirmLabel: "Yes" });
    await screen.findByRole("dialog");
    fireEvent.click(document.querySelector(".sheet-backdrop"));
    await expect(answer).resolves.toBe(false);
  });
});

describe("HUD", () => {
  it("announces a short message in a status region and clears it", async () => {
    vi.useFakeTimers();
    try {
      showHud("Focus set");
      // The host mounts its own live region; the message lands in it.
      const regions = await vi.waitFor(() => {
        const found = screen.getAllByRole("status").filter((el) => el.textContent.includes("Focus set"));
        expect(found.length).toBe(1);
        return found;
      });
      expect(regions[0]).toHaveAttribute("aria-live", "polite");
      vi.advanceTimersByTime(HUD_MS);
      await vi.waitFor(() =>
        expect(screen.queryAllByRole("status").some((el) => el.textContent.includes("Focus set"))).toBe(false)
      );
    } finally {
      dismissHud();
      vi.useRealTimers();
    }
  });
});
