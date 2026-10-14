import { useEffect, useRef } from "react";
import { isStandalone, startsAtEdge, lockDirection, dragOffset, flickVelocity, decideRelease } from "../lib/gestures.js";
import { prefersReducedMotion, skipNextTransition } from "../lib/navMotion.js";

const SETTLE_MS = 260;
const EASE = "cubic-bezier(.32,.72,0,1)";

// iOS-style edge swipe: in the installed app, a rightward drag that starts at
// the left edge of a pushed screen carries the page with the finger and goes
// back when released past 35% of the width, or with a quick flick.
// `target` is the element dragged; `onBack` navigates to the parent.
export function useSwipeBack({ enabled, path, targetRef, onBack }) {
  const backRef = useRef(onBack);
  useEffect(() => {
    backRef.current = onBack;
  });
  const pending = useRef(false); // a committed swipe waits for the route to change

  // The new screen is on: drop the leftover transform without animating.
  useEffect(() => {
    const el = targetRef.current;
    if (!el || !pending.current) return;
    pending.current = false;
    el.style.transition = "none";
    el.style.transform = "";
    el.classList.remove("is-swiping");
  }, [path, targetRef]);

  useEffect(() => {
    if (!enabled || !isStandalone()) return undefined;
    let g = null; // { id, x0, y0, dx, locked, samples }

    const reset = (el, animate) => {
      if (!el) return;
      const done = () => {
        el.style.transition = "";
        el.style.transform = "";
        el.classList.remove("is-swiping");
      };
      if (!animate || prefersReducedMotion()) return done();
      el.style.transition = `transform ${SETTLE_MS}ms ${EASE}`;
      el.style.transform = "translateX(0)";
      window.setTimeout(done, SETTLE_MS + 30);
    };

    const onStart = (e) => {
      if (pending.current || e.touches.length !== 1) {
        g = null;
        return;
      }
      const t = e.touches[0];
      g = startsAtEdge(t.clientX) ? { x0: t.clientX, y0: t.clientY, dx: 0, locked: "pending", samples: [{ x: t.clientX, t: e.timeStamp }] } : null;
    };

    const onMove = (e) => {
      const el = targetRef.current;
      if (!g || !el || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x0;
      if (g.locked === "pending") {
        g.locked = lockDirection(dx, t.clientY - g.y0);
        if (g.locked === "swipe") {
          el.style.transition = "none";
          el.classList.add("is-swiping");
        }
      }
      if (g.locked !== "swipe") {
        if (g.locked === "scroll") g = null;
        return;
      }
      if (e.cancelable) e.preventDefault();
      g.dx = dx;
      g.samples.push({ x: t.clientX, t: e.timeStamp });
      if (g.samples.length > 8) g.samples.shift();
      el.style.transform = `translateX(${dragOffset(dx, window.innerWidth)}px)`;
    };

    const onEnd = () => {
      const el = targetRef.current;
      const gesture = g;
      g = null;
      if (!gesture || gesture.locked !== "swipe" || !el) return;
      const width = window.innerWidth;
      const verdict = decideRelease({ dx: gesture.dx, width, velocity: flickVelocity(gesture.samples) });
      if (verdict === "cancel") return reset(el, true);
      const leave = () => {
        pending.current = true;
        skipNextTransition();
        backRef.current();
        // If the route never changes, bring the page home.
        window.setTimeout(() => {
          if (pending.current) {
            pending.current = false;
            reset(el, true);
          }
        }, 600);
      };
      if (prefersReducedMotion()) return leave();
      el.style.transition = `transform ${SETTLE_MS}ms ${EASE}`;
      el.style.transform = `translateX(${width}px)`;
      window.setTimeout(leave, SETTLE_MS);
    };

    const onCancel = () => {
      const el = targetRef.current;
      const gesture = g;
      g = null;
      if (gesture && gesture.locked === "swipe") reset(el, true);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled, targetRef]);
}
