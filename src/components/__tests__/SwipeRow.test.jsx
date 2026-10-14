import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SwipeRow from "../SwipeRow.jsx";

describe("SwipeRow", () => {
  it("renders its content and keeps the actions out of the tab order until revealed", () => {
    render(
      <ul>
        <SwipeRow as="li" actions={[{ label: "Delete", destructive: true, onSelect: () => {} }]}>
          <p>Row text</p>
        </SwipeRow>
      </ul>
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Row text");
    const del = screen.getByText("Delete", { selector: "span" }).closest("button");
    expect(del).toHaveClass("is-destructive");
    expect(del).toHaveAttribute("tabindex", "-1");
    expect(del.closest(".sw")).not.toHaveClass("is-revealed");
  });

  it("runs an action when it is pressed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SwipeRow actions={[{ label: "Delete", onSelect }]}>
        <p>Row</p>
      </SwipeRow>
    );
    await user.click(screen.getByText("Delete", { selector: "span" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("draws no actions layer without actions", () => {
    const { container } = render(
      <SwipeRow>
        <p>Row</p>
      </SwipeRow>
    );
    expect(container.querySelector(".sw-actions")).toBeNull();
  });
});
