// Pure decisions for dragging a bottom sheet down to dismiss it. The Sheet
// component feeds in pointer positions; nothing here touches the DOM.

// Far enough: more than this share of the sheet's height ends it.
export const DISMISS_RATIO = 0.3;
// Fast enough: a flick at this speed (px per ms) ends it, however short.
export const DISMISS_VELOCITY = 0.5;
// A flick must also have moved a little, so a tremor does not close it.
export const FLICK_MIN_DISTANCE = 8;
// Upward drags stretch a little, then stop, like a rubber band.
export const MAX_STRETCH = 12;
const VELOCITY_WINDOW_MS = 100;

// The offset to draw for a finger that has moved `dy` pixels from where it began.
export function dragOffset(dy) {
  if (!Number.isFinite(dy) || dy === 0) return 0;
  if (dy > 0) return dy;
  return -Math.min(MAX_STRETCH, -dy * 0.15);
}

// Speed of the last ~100 ms of movement, in px per ms. Positive is downward.
// `samples` run oldest first as { t, y }. A finger that rested before release
// has no speed, so `now` (the release time) matters.
export function velocityFrom(samples, now) {
  if (!Array.isArray(samples) || samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const release = Number.isFinite(now) ? now : last.t;
  if (release - last.t > VELOCITY_WINDOW_MS) return 0;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > VELOCITY_WINDOW_MS) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.y - first.y) / dt;
}

// Should releasing the finger now close the sheet?
//   dy       how far down the finger travelled (pixels)
//   height   the sheet's height (pixels)
//   velocity px per ms at release, positive downward
export function shouldDismiss({ dy, height, velocity = 0 }) {
  if (!(dy > 0) || !(height > 0)) return false;
  if (velocity <= -DISMISS_VELOCITY) return false; // flicked back up: stay
  if (velocity >= DISMISS_VELOCITY && dy >= FLICK_MIN_DISTANCE) return true;
  return dy / height > DISMISS_RATIO;
}

// How strong the dimmed backdrop should be while dragging: it fades as the
// sheet leaves. Returns 0..1.
export function backdropOpacity(offset, height) {
  if (!(height > 0) || !(offset > 0)) return 1;
  return Math.max(0, 1 - offset / height);
}
