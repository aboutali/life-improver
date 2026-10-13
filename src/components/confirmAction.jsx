import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ConfirmSheet } from "./ActionSheet.jsx";

// Replaces window.confirm. Opens an action sheet in its own React root and
// resolves true if the person picks the action, false on Cancel, a tap outside
// or Escape. Focus returns to whatever opened it.
//
//   confirmAction({ title, message, confirmLabel, destructive })
export function confirmAction({
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  destructive = false,
}) {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.setAttribute("data-action-sheet-root", "");
    document.body.appendChild(host);
    const root = createRoot(host);
    let settled = false;
    const onResult = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    // Once the sheet has slid away, tear its root down (outside React's turn).
    const onGone = () => {
      onResult(false);
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 0);
    };
    flushSync(() =>
      root.render(
        <ConfirmSheet
          title={title}
          message={message}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          destructive={destructive}
          onResult={onResult}
          onGone={onGone}
        />
      )
    );
  });
}
