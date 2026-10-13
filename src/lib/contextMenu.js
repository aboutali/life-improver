// Pure decisions for the long-press context menu: when a press counts, where
// the menu goes, and how arrow keys move through it.

export const LONG_PRESS_MS = 500;
export const MOVE_CANCEL_PX = 10;

// A finger that has moved this far from where it began is scrolling or
// swiping, not pressing.
export function movedTooFar(dx, dy, limit = MOVE_CANCEL_PX) {
  return Math.hypot(dx, dy) > limit;
}

// The keyboard's way to ask for a context menu.
export function isMenuKey(e) {
  return e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey);
}

// Next menu item for a key, wrapping at both ends. Returns the current index
// for keys that do not move. `count` is the number of items.
export function stepIndex(current, key, count) {
  if (!(count > 0)) return -1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowDown") return current < 0 ? 0 : (current + 1) % count;
  if (key === "ArrowUp") return current < 0 ? count - 1 : (current - 1 + count) % count;
  return current;
}

// Where to draw the lifted row and its menu.
//   row       { top, left, width, height } of the pressed row
//   menu      { width, height }
//   viewport  { width, height }
// Returns { menuTop, menuLeft, rowShift, placement }. The menu goes below the
// row if it fits, else above. If neither fits, the row slides up or down to
// make room. A row too tall for that leaves the menu pinned to the bottom.
export function placeMenu({ row, menu, viewport, margin = 12, gap = 10 }) {
  const maxLeft = Math.max(margin, viewport.width - menu.width - margin);
  const menuLeft = Math.min(Math.max(row.left + row.width - menu.width, margin), maxLeft);
  const bottom = viewport.height - margin;

  if (row.top + row.height + gap + menu.height <= bottom) {
    return { menuTop: row.top + row.height + gap, menuLeft, rowShift: 0, placement: "below" };
  }
  if (row.top - gap - menu.height >= margin) {
    return { menuTop: row.top - gap - menu.height, menuLeft, rowShift: 0, placement: "above" };
  }
  const total = row.height + gap + menu.height;
  if (total <= viewport.height - 2 * margin) {
    const top = bottom - total; // row's new top, menu sits below it
    return { menuTop: top + row.height + gap, menuLeft, rowShift: top - row.top, placement: "below" };
  }
  return { menuTop: bottom - menu.height, menuLeft, rowShift: 0, placement: "below" };
}

// A short label for a long piece of text, for names such as "More actions for ...".
export function shortLabel(text, max = 60) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
