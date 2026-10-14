import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContextMenu from "../ContextMenu.jsx";

function Harness({ onCopy = () => {}, onDelete = () => {} }) {
  return (
    <div>
      <ContextMenu
        className="row-x"
        label="Sleep, Oct 7"
        items={[
          { label: "Copy note", icon: "copy", onSelect: onCopy },
          { label: "Delete check-in", icon: "trash", destructive: true, onSelect: onDelete },
        ]}
      >
        <p>A row</p>
      </ContextMenu>
    </div>
  );
}

describe("ContextMenu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  afterEach(() => vi.useRealTimers());

  it("has a More actions button that declares a menu", () => {
    render(<Harness />);
    const more = screen.getByRole("button", { name: "More actions for Sleep, Oct 7" });
    expect(more).toHaveAttribute("aria-haspopup", "menu");
    expect(more).toHaveAttribute("aria-expanded", "false");
  });

  it("opens from the button with roles, and focuses the first item for the keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const more = screen.getByRole("button", { name: /More actions/ });
    more.focus();
    await user.keyboard("{Enter}");
    const menu = screen.getByRole("menu", { name: "Actions for Sleep, Oct 7" });
    expect(menu).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    expect(screen.getByRole("menuitem", { name: "Copy note" })).toHaveFocus();
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Delete check-in" })).toHaveClass("is-destructive");
  });

  it("moves with the arrow keys, wrapping, and Home/End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole("button", { name: /More actions/ }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete check-in" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Copy note" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete check-in" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Copy note" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Delete check-in" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const more = screen.getByRole("button", { name: /More actions/ });
    more.focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(more).toHaveFocus();
  });

  it("opens with Shift+F10 and the context-menu key from inside the row", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole("button", { name: /More actions/ }).focus();
    await user.keyboard("{Shift>}{F10}{/Shift}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    fireEvent.keyDown(screen.getByRole("button", { name: /More actions/ }), { key: "ContextMenu" });
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("opens on right-click", () => {
    render(<Harness />);
    fireEvent.contextMenu(screen.getByText("A row"), { clientX: 40, clientY: 40 });
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("runs the chosen action after closing", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<Harness onDelete={onDelete} />);
    fireEvent.contextMenu(screen.getByText("A row"));
    await user.click(screen.getByRole("menuitem", { name: "Delete check-in" }));
    expect(screen.queryByRole("menu")).toBeNull();
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("makes the page behind inert while open and gives it back", async () => {
    const user = userEvent.setup();
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    render(<Harness />, { container: root, baseElement: document.body });
    fireEvent.contextMenu(screen.getByText("A row"));
    expect(root).toHaveAttribute("inert");
    await user.keyboard("{Escape}");
    expect(root).not.toHaveAttribute("inert");
    expect(root).not.toHaveAttribute("aria-hidden");
  });

  it("opens after a 500ms touch press", () => {
    vi.useFakeTimers();
    render(<Harness />);
    const row = screen.getByText("A row");
    fireEvent.pointerDown(row, { pointerType: "touch", pointerId: 1, isPrimary: true, clientX: 50, clientY: 50 });
    act(() => vi.advanceTimersByTime(499));
    expect(screen.queryByRole("menu")).toBeNull();
    act(() => vi.advanceTimersByTime(2));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("cancels the press when the finger moves more than 10px or lifts", () => {
    vi.useFakeTimers();
    render(<Harness />);
    const row = screen.getByText("A row");
    fireEvent.pointerDown(row, { pointerType: "touch", pointerId: 1, isPrimary: true, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(row, { pointerType: "touch", pointerId: 1, clientX: 50, clientY: 62 });
    act(() => vi.advanceTimersByTime(700));
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.pointerDown(row, { pointerType: "touch", pointerId: 2, isPrimary: true, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(row, { pointerType: "touch", pointerId: 2, clientX: 54, clientY: 53 });
    fireEvent.pointerUp(row, { pointerType: "touch", pointerId: 2 });
    act(() => vi.advanceTimersByTime(700));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not long-press with a mouse", () => {
    vi.useFakeTimers();
    render(<Harness />);
    fireEvent.pointerDown(screen.getByText("A row"), { pointerType: "mouse", pointerId: 1, isPrimary: true, clientX: 5, clientY: 5 });
    act(() => vi.advanceTimersByTime(900));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows no button or menu without items", () => {
    render(
      <ContextMenu items={[false, null]}>
        <p>Plain</p>
      </ContextMenu>
    );
    expect(screen.queryByRole("button")).toBeNull();
    fireEvent.contextMenu(screen.getByText("Plain"));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
