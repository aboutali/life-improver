// Pure decisions for swiping a list row sideways to reveal its actions (Mail,
// Things). SwipeRow feeds in finger positions; nothing here touches the DOM.
// Offsets are in pixels: 0 is closed, negative is revealed (the row has moved
// left).

export const LOCK_PX = 8;           // movement before the direction is decided
export const ACTION_WIDTH = 88;     // width of one revealed action
export const FULL_FRACTION = 0.6;   // drag past this share of the row to run the first action
export const FLICK_VELOCITY = 0.5;  // px per ms; a quick flick opens the row
export const PROJECT_MS = 120;      // how far ahead the finger's speed is carried
const RUBBER = 0.55;                // how hard the row resists past the actions

// "pending" until the finger has moved LOCK_PX, then the dominant axis.
// "vertical" hands the gesture back to the page's scroll.
export function lockAxis(dx, dy, lock = LOCK_PX) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < lock) return "pending";
  return Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
}

export function actionsWidth(count) {
  return Math.max(0, Math.floor(count)) * ACTION_WIDTH;
}

// iOS rubber band: grows with `over` but never reaches `limit`.
export function rubberBand(over, limit, c = RUBBER) {
  if (!(over > 0) || !(limit > 0)) return 0;
  return (1 - 1 / ((over * c) / limit + 1)) * limit;
}

// Where the row is drawn. `startOffset` is where it was when the finger went
// down (0 or -aw), `dx` how far the finger moved. Right of closed does not
// move; past the actions the row resists.
export function swipeOffset({ startOffset = 0, dx, aw, rowWidth }) {
  if (!(aw > 0)) return 0;
  const raw = startOffset + dx;
  if (raw >= 0) return 0;
  const travel = -raw;
  if (travel <= aw) return raw;
  const limit = Math.max((rowWidth || 0) - aw, aw);
  return -(aw + rubberBand(travel - aw, limit));
}

// Has the finger dragged far enough to run the first action?
export function isFullSwipe({ startOffset = 0, dx, rowWidth, hasActions = true }) {
  if (!hasActions || !(rowWidth > 0)) return false;
  return -(startOffset + dx) >= FULL_FRACTION * rowWidth;
}

// "full" runs the first action, "open" leaves the actions showing, "close"
// puts the row back. `velocity` is px per ms, positive to the right.
export function decideRelease({ startOffset = 0, dx, velocity = 0, aw, rowWidth }) {
  if (!(aw > 0)) return "close";
  if (isFullSwipe({ startOffset, dx, rowWidth })) return "full";
  const offset = swipeOffset({ startOffset, dx, aw, rowWidth });
  const projected = offset + velocity * PROJECT_MS;
  return -projected >= aw / 2 ? "open" : "close";
}

// Where the row settles for a decision.
export function restingOffset(decision, aw, rowWidth) {
  if (decision === "open") return -aw;
  if (decision === "full") return -rowWidth;
  return 0;
}
