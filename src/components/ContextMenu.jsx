import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LONG_PRESS_MS, isMenuKey, movedTooFar, placeMenu, stepIndex } from "../lib/contextMenu.js";
import { closeSwipeRows } from "../lib/swipeRegistry.js";

const svgProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

const ICONS = {
  trash: (
    <svg {...svgProps}>
      <path d="M4 7h16M10 7V4.5h4V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5" />
    </svg>
  ),
  copy: (
    <svg {...svgProps}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
    </svg>
  ),
  plant: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  book: (
    <svg {...svgProps}>
      <path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v13H7.5A2.5 2.5 0 0 1 5 17.5zM5 17.5A2.5 2.5 0 0 1 7.5 15H17" />
    </svg>
  ),
};

// Keep the page behind the menu still. Idempotent; the returned function undoes it.
function lockPage() {
  const root = typeof document === "undefined" ? null : document.getElementById("root");
  if (!root) return () => {};
  const had = root.hasAttribute("inert");
  if (!had) {
    root.setAttribute("inert", "");
    root.setAttribute("aria-hidden", "true");
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (!had) {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
    }
  };
}

// The lifted row, a blurred backdrop and the menu. Mounted only while open.
function MenuLayer({ items, label, rowEl, rect, via, onDismiss, onChoose, menuId, settling }) {
  const menuRef = useRef(null);
  const liftRef = useRef(null);
  const itemRefs = useRef([]);
  const [pos, setPos] = useState(null);

  // A copy of the pressed row floats above the backdrop, as in iOS.
  useLayoutEffect(() => {
    const host = liftRef.current;
    if (!host || !rowEl) return undefined;
    const copy = rowEl.cloneNode(true);
    copy.removeAttribute("id");
    copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    copy.querySelectorAll(".cm-more").forEach((n) => n.remove());
    copy.style.cssText = "";
    copy.classList.remove("is-pressed");
    copy.classList.add("cm-copy");
    host.appendChild(copy);
    return () => copy.remove();
  }, [rowEl]);

  useLayoutEffect(() => {
    const m = menuRef.current;
    if (!m) return;
    setPos(
      placeMenu({
        row: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        menu: { width: m.offsetWidth, height: m.offsetHeight },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      })
    );
  }, [rect]);

  // Focus moves in once the menu is placed and visible (hidden elements cannot take focus).
  const focused = useRef(false);
  const placed = pos !== null;
  useEffect(() => {
    if (!placed || focused.current) return;
    focused.current = true;
    const target = via === "keyboard" ? itemRefs.current[0] : menuRef.current;
    if (target) target.focus({ preventScroll: true });
  }, [placed, via]);

  const move = (key) => {
    const at = itemRefs.current.findIndex((el) => el === document.activeElement);
    const next = stepIndex(at, key, items.length);
    if (next >= 0 && itemRefs.current[next]) itemRefs.current[next].focus({ preventScroll: true });
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onDismiss();
    } else if (e.key === "Tab") {
      e.preventDefault();
      onDismiss();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      move(e.key);
    }
  };

  // A release that ends the long press must not close the menu it just opened.
  const onBackdrop = () => {
    if (settling()) return;
    onDismiss();
  };

  const style = pos
    ? { top: pos.menuTop, left: pos.menuLeft, transformOrigin: `${pos.placement === "above" ? "bottom" : "top"} right` }
    : { top: 0, left: 0, visibility: "hidden" };

  const sepAt = items.findIndex((it, i) => it.destructive && i > 0 && !items[i - 1].destructive);
  return createPortal(
    <div
      className="cm-root"
      onKeyDown={onKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div
        className="cm-backdrop"
        aria-hidden="true"
        onClick={onBackdrop}
        onContextMenu={(e) => {
          e.preventDefault();
          onBackdrop();
        }}
      />
      <div
        ref={liftRef}
        className="cm-lift"
        aria-hidden="true"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          "--cm-shift": `${pos ? pos.rowShift : 0}px`,
        }}
      />
      <div
        ref={menuRef}
        id={menuId}
        className="cm-menu"
        role="menu"
        aria-label={label}
        tabIndex={-1}
        style={style}
      >
        {items.map((it, i) => {
          const sep = i === sepAt;
          return (
            <div key={it.label} role="none" className="cm-cell">
              {sep && <div role="separator" className="cm-sep" />}
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={`cm-item${it.destructive ? " is-destructive" : ""}`}
                onClick={() => onChoose(it)}
              >
                <span className="cm-item-label">{it.label}</span>
                {it.icon && ICONS[it.icon] ? <span className="cm-item-ic">{ICONS[it.icon]}</span> : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

// Wraps a row and gives it a context menu: long-press (500ms, cancelled by a
// move of more than 10px) on touch, right-click, Shift+F10 or the context-menu
// key, and an always-present "More actions" button for everyone else.
//
//   as         element to render (default "div")
//   items      [{ label, icon?, destructive?, onSelect }]; falsy entries are skipped
//   label      what the row is, for "More actions for ..." and the menu's name
// The pressed row lifts over a blurred, dimmed backdrop with the menu beside it.
// Arrow keys move, Escape closes, and focus returns to the "More actions" button.
export default function ContextMenu({ as: Tag = "div", className = "", items, label = "", children, ...rest }) {
  const rowRef = useRef(null);
  const moreRef = useRef(null);
  const menuId = useId();
  const [state, setState] = useState(null); // { via, rect } while open
  const stateRef = useRef(null);
  const press = useRef(null);
  // When the menu opened, or Infinity while the finger that opened it is still down.
  const openedAt = useRef(0);
  const unlock = useRef(null);
  const list = (items || []).filter(Boolean);

  const finish = (refocus) => {
    if (!stateRef.current) return;
    stateRef.current = null;
    if (unlock.current) unlock.current();
    unlock.current = null;
    setState(null);
    if (refocus && moreRef.current && moreRef.current.isConnected) moreRef.current.focus({ preventScroll: true });
  };

  const openMenu = (via) => {
    if (stateRef.current || !rowRef.current || !list.length) return;
    closeSwipeRows();
    openedAt.current = via === "touch" ? Infinity : performance.now();
    if (via === "touch") {
      const release = () => {
        openedAt.current = performance.now();
        window.removeEventListener("pointerup", release, true);
        window.removeEventListener("pointercancel", release, true);
        window.removeEventListener("touchend", release, true);
      };
      window.addEventListener("pointerup", release, true);
      window.addEventListener("pointercancel", release, true);
      window.addEventListener("touchend", release, true);
    }
    const next = { via, el: rowRef.current, rect: rowRef.current.getBoundingClientRect() };
    stateRef.current = next;
    unlock.current = lockPage();
    setState(next);
  };

  // Give the page back if the row goes away while the menu is open.
  useEffect(
    () => () => {
      if (unlock.current) unlock.current();
    },
    []
  );

  const choose = (item) => {
    finish(true);
    window.setTimeout(() => item.onSelect?.(), 0);
  };

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    if (e.target.closest && e.target.closest(".cm-more")) return;
    cancelPress();
    press.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        press.current = null;
        openMenu("touch");
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (e) => {
    const p = press.current;
    if (p && p.id === e.pointerId && movedTooFar(e.clientX - p.x, e.clientY - p.y)) cancelPress();
  };

  const onContextMenu = (e) => {
    if (e.target.closest && e.target.closest(".cm-menu")) return;
    e.preventDefault();
    cancelPress();
    openMenu(e.detail === 0 && e.clientX === 0 && e.clientY === 0 ? "keyboard" : "pointer");
  };

  const onKeyDown = (e) => {
    if (!isMenuKey(e)) return;
    e.preventDefault();
    openMenu("keyboard");
  };

  // The click that follows a long press must not act on whatever was under the
  // finger, nor close the menu: ignore clicks until shortly after the release.
  const settling = () => openedAt.current > 0 && performance.now() - openedAt.current < 600;
  const onClickCapture = (e) => {
    if (state && settling()) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <>
    <Tag
      ref={rowRef}
      className={`cm${className ? ` ${className}` : ""}${state ? " is-pressed" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      onClickCapture={onClickCapture}
      {...rest}
    >
      {children}
      {list.length > 0 && (
        <button
          ref={moreRef}
          type="button"
          className="cm-more"
          aria-label={label ? `More actions for ${label}` : "More actions"}
          aria-haspopup="menu"
          aria-expanded={!!state}
          aria-controls={state ? menuId : undefined}
          onClick={(e) => openMenu(e.detail === 0 ? "keyboard" : "pointer")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <circle cx="5.5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="18.5" cy="12" r="1.8" />
          </svg>
        </button>
      )}
    </Tag>
    {state && (
        <MenuLayer
          items={list}
          label={label ? `Actions for ${label}` : "Actions"}
          rowEl={state.el}
          rect={state.rect}
          via={state.via}
          menuId={menuId}
          settling={settling}
          onDismiss={() => finish(true)}
          onChoose={choose}
        />
    )}
    </>
  );
}
