// Pure decision logic for the edge swipe that goes back on pushed screens.

export const EDGE_PX = 20;           // the touch must start this close to the left edge
export const LOCK_PX = 10;           // movement before the direction is decided
export const COMMIT_FRACTION = 0.35; // drag past this share of the width to go back
export const FLICK_VELOCITY = 0.5;   // px per ms
export const FLICK_MIN_PX = 24;      // a flick must still travel this far

export function isStandalone(win = typeof window === "undefined" ? undefined : window) {
  if (!win) return false;
  if (win.navigator?.standalone === true) return true;
  return typeof win.matchMedia === "function" && win.matchMedia("(display-mode: standalone)").matches;
}

export function startsAtEdge(x, edge = EDGE_PX) {
  return Number.isFinite(x) && x >= 0 && x <= edge;
}

// "pending" until the finger has moved LOCK_PX. Then "swipe" for a mostly
// rightward move and "scroll" for anything else (vertical, or leftward).
export function lockDirection(dx, dy, lock = LOCK_PX) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < lock) return "pending";
  if (dx > 0 && Math.abs(dx) > Math.abs(dy)) return "swipe";
  return "scroll";
}

// How far the page follows the finger.
export function dragOffset(dx, width) {
  if (!(width > 0)) return 0;
  return Math.min(Math.max(dx, 0), width);
}

// Speed over the last `windowMs` of [{ x, t }] samples, in px per ms.
export function flickVelocity(samples, windowMs = 100) {
  if (!samples || samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (const s of samples) {
    if (last.t - s.t <= windowMs) {
      first = s;
      break;
    }
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}

// "commit" goes back, "cancel" springs the page home.
export function decideRelease({ dx, width, velocity = 0 }) {
  if (!(width > 0) || dx <= 0) return "cancel";
  if (dx / width >= COMMIT_FRACTION) return "commit";
  if (velocity >= FLICK_VELOCITY && dx >= FLICK_MIN_PX) return "commit";
  return "cancel";
}
