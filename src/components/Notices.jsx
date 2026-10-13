import { useState, useSyncExternalStore } from "react";
import { getStorageStatus, subscribeStorageStatus } from "../lib/storage.js";
import { clearNotice, useNotice } from "../lib/notice.js";
import { href } from "../lib/router.js";

// Small decorative line icons for the two warnings.
const NoticeIcon = ({ name }) => (
  <svg className="notice-ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === "off" ? (
      <>
        <path d="M5 6.5h11l3 3V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
        <path d="M8.5 6.5v4h6v-4M8.5 20v-5h7v5" />
        <path d="M3.5 3.5l17 17" />
      </>
    ) : (
      <>
        <path d="M11 4.2a1.2 1.2 0 0 1 2 0l8 14a1.2 1.2 0 0 1-1 1.8H4a1.2 1.2 0 0 1-1-1.8z" />
        <path d="M12 10v4.5M12 17.2v.1" />
      </>
    )}
  </svg>
);

const WELCOME = new Set(["/welcome", "/welcome/rate", "/welcome/focus"]);
// Their empty states already lead to the welcome.
const QUIET_FOR_NEWCOMER = new Set(["/checkin", "/journey"]);

// Messages above the screen, most urgent first:
//  - saving is off (persistent, no dismiss)
//  - saved data could not be read (dismissable)
//  - a one-shot notice, e.g. after a restore (dismissable)
//  - a newcomer's nudge to the welcome (slim, off the welcome screens)
export default function Notices({ path, isNewcomer, hasData = true, onDownload }) {
  const status = useSyncExternalStore(subscribeStorageStatus, getStorageStatus, getStorageStatus);
  const notice = useNotice();
  // Dismissal is keyed by what was damaged, so new damage speaks again.
  const [dismissed, setDismissed] = useState("");
  const damagedKey = status.damaged.join("|");
  const showDamaged = status.damaged.length > 0 && dismissed !== damagedKey;
  const showNewcomer = isNewcomer && !WELCOME.has(path) && !QUIET_FOR_NEWCOMER.has(path);

  if (status.available && !showDamaged && !notice && !showNewcomer) return null;

  return (
    <div className="notices">
      {!status.available && (
        <div className="notice notice-warn" role="alert">
          <NoticeIcon name="off" />
          <span className="notice-text">Saving is off in this browser. Download a copy before you leave.</span>
          {path !== "/settings" && hasData && (
            <button type="button" className="notice-btn" onClick={onDownload}>Download a copy</button>
          )}
        </div>
      )}
      {showDamaged && (
        <div className="notice" role="status">
          <NoticeIcon name="damaged" />
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
