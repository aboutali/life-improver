import { useState, useSyncExternalStore } from "react";
import { getStorageStatus, subscribeStorageStatus } from "../lib/storage.js";
import { clearNotice, useNotice } from "../lib/notice.js";
import { href } from "../lib/router.js";

const WELCOME = new Set(["/welcome", "/welcome/rate", "/welcome/focus"]);

// Messages above the screen, most urgent first:
//  - saving is off (persistent, no dismiss)
//  - saved data could not be read (dismissable)
//  - a one-shot notice, e.g. after a restore (dismissable)
//  - a newcomer's nudge to the welcome (slim, off the welcome screens)
export default function Notices({ path, isNewcomer, onDownload }) {
  const status = useSyncExternalStore(subscribeStorageStatus, getStorageStatus, getStorageStatus);
  const notice = useNotice();
  // Dismissal is keyed by what was damaged, so new damage speaks again.
  const [dismissed, setDismissed] = useState("");
  const damagedKey = status.damaged.join("|");
  const showDamaged = status.damaged.length > 0 && dismissed !== damagedKey;
  const showNewcomer = isNewcomer && !WELCOME.has(path);

  if (status.available && !showDamaged && !notice && !showNewcomer) return null;

  return (
    <div className="notices">
      {!status.available && (
        <div className="notice notice-warn" role="alert">
          <span className="notice-text">Saving is off in this browser. Download a copy before you leave.</span>
          {path !== "/settings" && (
            <button type="button" className="notice-btn" onClick={onDownload}>Download a copy</button>
          )}
        </div>
      )}
      {showDamaged && (
        <div className="notice" role="status">
          <span className="notice-text">Some saved data could not be read.</span>
          {path !== "/settings" && <a href={href("/settings")}>Open Settings</a>}
          <button type="button" className="notice-btn" onClick={() => setDismissed(damagedKey)}>Dismiss</button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span className="notice-text">{notice}</span>
          <button type="button" className="notice-btn" onClick={clearNotice}>Dismiss</button>
        </div>
      )}
      {showNewcomer && (
        <div className="notice notice-slim" role="status">
          <span className="notice-text">
            New here? <a href={href("/welcome")}>Begin with a one-minute welcome.</a>
          </span>
        </div>
      )}
    </div>
  );
}
