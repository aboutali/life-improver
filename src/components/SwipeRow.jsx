import { useCallback, useEffect, useId, useRef, useState } from "react";
import { flickVelocity } from "../lib/gestures.js";
import { actionsWidth, decideRelease, lockAxis, restingOffset, swipeOffset } from "../lib/swipe.js";
import { registerOpenRow, unregisterRow } from "../lib/swipeRegistry.js";

const SETTLE_MS = 360; // matches --sw-settle in the Rows section

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A list row that slides left under the finger to show action buttons, like
// Mail and Things. A full swipe runs the first action. Vertical scrolling is
// left to the page, one row is open at a time, and a tap elsewhere closes it.
//
// A swipe is a shortcut, never the only way: put the same actions in a
// ContextMenu inside the row, whose "More actions" button is always there.
//
//   as         element to render (default "div"; use "li" inside a list)
//   actions    [{ label, destructive?, onSelect }]; the first is the full-swipe
//              action and sits at the outer edge. onSelect may return a promise;
//              the row closes once it settles.
//   bodyClassName  class for the sliding layer
export default function SwipeRow({ as: Tag = "div", className = "", bodyClassName = "", actions = [], children, ...rest }) {
  const id = useId();
  const rootRef = useRef(null);
  const bodyRef = useRef(null);
  const g = useRef(null); // the gesture in progress
  const openRef = useRef(false);
  const suppressClick = useRef(false);
  const timers = useRef([]);
  const [revealed, setRevealed] = useState(false);
  const aw = actionsWidth(actions.length);
  const hasActions = aw > 0;

  const setX = useCallback((x) => {
    const el = rootRef.current;
    if (el) el.style.setProperty("--sw-x", `${x}px`);
  }, []);

  const later = (fn, ms) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };

  const settleTo = useCallback(
    (x) => {
      const el = rootRef.current;
      if (!el) return;
      el.classList.remove("is-dragging");
      setX(x);
      const done = x === 0;
      if (done) {
        later(() => {
          if (!openRef.current) {
            el.classList.remove("is-full");
            setRevealed(false);
          }
        }, reducedMotion() ? 0 : SETTLE_MS);
      }
    },
    [setX]
  );

  const close = useCallback(() => {
    openRef.current = false;
    unregisterRow(id);
    settleTo(0);
  }, [id, settleTo]);

  const open = useCallback(() => {
    openRef.current = true;
    setRevealed(true);
    registerOpenRow(id, close);
    settleTo(-aw);
  }, [id, close, aw, settleTo]);

  useEffect(
    () => () => {
      unregisterRow(id);
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [id]
  );

  // A tap or press anywhere outside an open row closes it.
  useEffect(() => {
    if (!revealed) return undefined;
    const onDown = (e) => {
      if (openRef.current && rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [revealed, close]);

  const onPointerDown = (e) => {
    if (!hasActions || e.pointerType === "mouse" || !e.isPrimary) return;
    const el = rootRef.current;
    if (!el) return;
    g.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      start: openRef.current ? -aw : 0,
      width: el.offsetWidth,
      axis: "pending",
      dx: 0,
      samples: [{ x: e.clientX, t: e.timeStamp }],
    };
  };

  const onPointerMove = (e) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (s.axis === "pending") {
      s.axis = lockAxis(dx, dy);
      if (s.axis === "horizontal") {
        const el = rootRef.current;
        el.classList.add("is-dragging");
        setRevealed(true);
        suppressClick.current = true;
      }
    }
    if (s.axis !== "horizontal") return;
    s.dx = dx;
    s.samples.push({ x: e.clientX, t: e.timeStamp });
    if (s.samples.length > 12) s.samples.shift();
    const x = swipeOffset({ startOffset: s.start, dx, aw, rowWidth: s.width });
    setX(x);
    rootRef.current.classList.toggle("is-full", decideRelease({ startOffset: s.start, dx, aw, rowWidth: s.width }) === "full");
  };

  const runAction = useCallback(
    async (action) => {
      try {
        await action.onSelect?.();
      } finally {
        if (rootRef.current) close();
      }
    },
    [close]
  );

  const end = (e, cancelled) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    g.current = null;
    if (s.axis !== "horizontal") return;
    later(() => {
      suppressClick.current = false;
    }, 80);
    const velocity = cancelled ? 0 : flickVelocity(s.samples);
    const decision = cancelled
      ? s.start < 0
        ? "open"
        : "close"
      : decideRelease({ startOffset: s.start, dx: s.dx, velocity, aw, rowWidth: s.width });
    if (decision === "full") {
      // The row leaves, the first action runs, and the row comes back if it was kept.
      openRef.current = true;
      registerOpenRow(id, close);
      settleTo(restingOffset("full", aw, s.width));
      runAction(actions[0]);
    } else if (decision === "open") {
      open();
    } else {
      close();
    }
  };

  // A tap on an open row closes it instead of acting; so does the end of a drag.
  const onClickCapture = (e) => {
    if (suppressClick.current && !(e.target.closest && e.target.closest(".sw-actions"))) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (openRef.current && bodyRef.current && bodyRef.current.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape" && openRef.current) {
      e.stopPropagation();
      close();
    }
  };

  return (
    <Tag
      ref={rootRef}
      className={`sw${revealed ? " is-revealed" : ""}${className ? ` ${className}` : ""}`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => end(e, false)}
      onPointerCancel={(e) => end(e, true)}
      onClickCapture={onClickCapture}
      {...rest}
    >
      {hasActions && (
        <div className="sw-actions">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`sw-act${a.destructive ? " is-destructive" : ""}`}
              tabIndex={revealed ? 0 : -1}
              onClick={() => runAction(a)}
            >
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <div
        ref={bodyRef}
        className={`sw-body${bodyClassName ? ` ${bodyClassName}` : ""}`}
      >
        {children}
      </div>
    </Tag>
  );
}
