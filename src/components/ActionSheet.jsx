import { useId, useState } from "react";
import Sheet from "./Sheet.jsx";
import { haptic } from "../lib/haptics.js";

// iOS-style action sheet: one grouped card holding a title, a message and the
// options, and a separate Cancel button below it. A destructive option is red.
//
//   actions   [{ label, destructive?, onSelect }]
//   onCancel  Cancel, backdrop tap and Escape all call this
// Most callers use confirmAction() (confirmAction.jsx) instead of this.
export default function ActionSheet({
  open,
  title,
  message,
  actions,
  cancelLabel = "Cancel",
  onCancel,
  onExited,
}) {
  const uid = useId();
  const titleId = `${uid}-t`;
  const messageId = `${uid}-m`;
  return (
    <Sheet
      open={open}
      variant="action"
      labelledBy={titleId}
      describedBy={message ? messageId : undefined}
      onClose={onCancel}
      onExited={onExited}
    >
      <div className="as-group">
        <div className="as-info">
          <p id={titleId} className="as-title">{title}</p>
          {message && <p id={messageId} className="as-message">{message}</p>}
        </div>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`as-opt${a.destructive ? " is-destructive" : ""}`}
            onClick={a.onSelect}
          >
            {a.label}
          </button>
        ))}
      </div>
      <button type="button" className="as-cancel" data-autofocus onClick={onCancel}>
        {cancelLabel}
      </button>
    </Sheet>
  );
}

// The sheet confirmAction() puts on screen: one option and Cancel. It closes
// itself, then reports the choice through `onResult(true | false)`.
export function ConfirmSheet({ title, message, confirmLabel, cancelLabel, destructive, onResult, onGone }) {
  const [open, setOpen] = useState(true);
  const choose = (value) => {
    if (value && destructive) haptic("warning");
    setOpen(false);
    onResult(value);
  };
  return (
    <ActionSheet
      open={open}
      title={title}
      message={message}
      cancelLabel={cancelLabel}
      actions={[{ label: confirmLabel, destructive, onSelect: () => choose(true) }]}
      onCancel={() => choose(false)}
      onExited={onGone}
    />
  );
}
