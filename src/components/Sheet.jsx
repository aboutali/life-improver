import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { backdropOpacity, dragOffset, shouldDismiss, velocityFrom } from "../lib/sheetDrag.js";

// How long the slide-out takes. Matches --sheet-out in the Sheets section.
const EXIT_MS = 320;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ---- Layers: which sheet is on top, and keeping the page behind it still ----

const stack = [];

function applyPageLock() {
  if (typeof document === "undefined") return;
  const on = stack.length > 0;
  const root = document.getElementById("root");
  if (root) {
    if (on) {
      root.setAttribute("inert", "");
      root.setAttribute("aria-hidden", "true");
    } else {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
    }
  }
  document.documentElement.classList.toggle("sheet-open", on);
}

const pushLayer = (id) => {
  stack.push(id);
  applyPageLock();
};
const popLayer = (id) => {
  const at = stack.indexOf(id);
  if (at >= 0) stack.splice(at, 1);
  applyPageLock();
};
const isTop = (id) => stack[stack.length - 1] === id;

// Safari does not focus a button when it is tapped, so remember the last
// control the person pressed as a place to return to.
let lastPressed = null;
if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target && e.target.closest ? e.target.closest("button, a, [role='button']") : null;
      if (el) lastPressed = el;
    },
    true
  );
}

function findOpener() {
  const active = document.activeElement;
  if (active && active !== document.body && active.isConnected) return active;
  return lastPressed && lastPressed.isConnected ? lastPressed : null;
}

const prefersMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isDesktop = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(min-width: 700px)").matches;

// A bottom sheet on phones, a centred card on wide screens.
//
// Closes by the close button, Escape, a tap on the dimmed backdrop, or (on
// phones) dragging the header down. Focus moves into the sheet, stays there,
// and returns to the control that opened it. The page behind is made inert.
//
// Props:
//   open, onClose    controlled; the sheet slides out after `open` turns false
//   title            shown in the header (variant "sheet"); labels the dialog
//   variant          "sheet" (header, scrolling body) or "action" (iOS action
//                    sheet: the caller draws everything, pass labelledBy)
//   labelledBy / describedBy   ids, for the action variant
//   returnFocusRef   fallback target if the opener has left the page
//   onExited         called once the sheet has fully left
export default function Sheet({
  open,
  onClose,
  title,
  children,
  variant = "sheet",
  labelledBy,
  describedBy,
  returnFocusRef,
  onExited,
  className = "",
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const layerId = uid;
  const [phase, setPhase] = useState(open ? "open" : "closed");
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const headingRef = useRef(null);
  const drag = useRef(null);
  const onCloseRef = useRef(onClose);
  const onExitedRef = useRef(onExited);
  const returnRef = useRef(returnFocusRef);
  const closingRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
    onExitedRef.current = onExited;
    returnRef.current = returnFocusRef;
  });

  // open -> open | closing | closed. Adjusted during render, as React advises
  // for state that follows a prop, so the sheet never shows a stale frame.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPhase("open");
    else if (phase === "open") setPhase(prefersMotion() ? "closing" : "closed");
  }

  useEffect(() => {
    if (phase !== "closing") return undefined;
    const t = setTimeout(() => setPhase("closed"), EXIT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const shown = open || phase !== "closed";
  const closing = !open && phase === "closing";
  useEffect(() => {
    closingRef.current = closing;
  }, [closing]);

  // Take the page, move focus in; give both back when the sheet is gone.
  useEffect(() => {
    if (!shown) return undefined;
    const opener = findOpener();
    pushLayer(layerId);
    const panel = panelRef.current;
    if (panel) {
      const target = panel.querySelector("[data-autofocus]") || headingRef.current || panel;
      target.focus({ preventScroll: true });
    }
    return () => {
      popLayer(layerId);
      const back = opener && opener.isConnected ? opener : returnRef.current && returnRef.current.current;
      if (back && back.isConnected && typeof back.focus === "function") back.focus({ preventScroll: true });
      if (onExitedRef.current) onExitedRef.current();
    };
  }, [shown, layerId]);

  // Escape closes; Tab stays inside; focus that strays is pulled back.
  useEffect(() => {
    if (!shown) return undefined;
    const onKey = (e) => {
      if (!isTop(layerId) || closingRef.current) return;
      const panel = panelRef.current;
      if (!panel) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (onCloseRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hidden && el.getAttribute("aria-hidden") !== "true"
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === panel || active === headingRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (e) => {
      const panel = panelRef.current;
      if (!isTop(layerId) || closingRef.current || !panel) return;
      if (!panel.contains(e.target)) panel.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [shown, layerId]);

  // ---- Drag the header down to dismiss (phones) ----

  const setOffset = (px, height) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (panel) panel.style.setProperty("--drag", `${px}px`);
    if (backdrop) backdrop.style.setProperty("--bd", String(backdropOpacity(px, height)));
  };

  const onPointerDown = (e) => {
    if (isDesktop() || closingRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest && e.target.closest("button")) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.classList.remove("is-settling");
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      height: panel.offsetHeight,
      samples: [{ t: e.timeStamp, y: e.clientY }],
      dy: 0,
    };
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture is a nicety; dragging still works without it.
      }
    }
    panel.classList.add("is-dragging");
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dy = e.clientY - d.startY;
    d.samples.push({ t: e.timeStamp, y: e.clientY });
    if (d.samples.length > 12) d.samples.shift();
    setOffset(dragOffset(d.dy), d.height);
  };

  const endDrag = (e, cancelled) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const panel = panelRef.current;
    if (!panel) return;
    panel.classList.remove("is-dragging");
    const velocity = cancelled ? 0 : velocityFrom(d.samples, e.timeStamp);
    if (!cancelled && shouldDismiss({ dy: d.dy, height: d.height, velocity })) {
      if (onCloseRef.current) onCloseRef.current();
      return;
    }
    // Spring back.
    panel.classList.add("is-settling");
    setOffset(0, d.height);
    setTimeout(() => panel.classList.remove("is-settling"), 360);
  };

  if (!shown || typeof document === "undefined") return null;

  const isAction = variant === "action";
  const labelId = !isAction && title !== undefined ? titleId : labelledBy;

  return createPortal(
    <div className={`sheet-root${isAction ? " is-action" : ""}${className ? ` ${className}` : ""}`}>
      <div
        ref={backdropRef}
        className={`sheet-backdrop${closing ? " is-closing" : ""}`}
        aria-hidden="true"
        onClick={() => onClose && onClose()}
      />
      <div
        ref={panelRef}
        className={`sheet${isAction ? " sheet-action" : ""}${closing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {!isAction && title !== undefined && (
          <div
            className="sheet-head"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, false)}
            onPointerCancel={(e) => endDrag(e, true)}
          >
            <span className="sheet-grab" aria-hidden="true" />
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className="sheet-title">{title}</h2>
            <button type="button" className="sheet-x" aria-label="Close" onClick={() => onClose && onClose()}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        )}
        {isAction ? children : <div className="sheet-body">{children}</div>}
      </div>
    </div>,
    document.body
  );
}
