import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { buildExport, importData, readBadCopies } from "../lib/storage.js";
import { finishRestore } from "../lib/notice.js";
import { saveJson } from "../lib/download.js";
import { toLocalDate } from "../lib/dates.js";
import { href } from "../lib/router.js";

// `beforeinstallprompt` fires once, early. Capture it at module load so the
// Install button still works when the person opens Settings later.
let installEvent = null;
const installListeners = new Set();
const notifyInstall = () => installListeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    notifyInstall();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    notifyInstall();
  });
}

function useInstallPrompt() {
  return useSyncExternalStore(
    (fn) => {
      installListeners.add(fn);
      return () => installListeners.delete(fn);
    },
    () => installEvent,
    () => null
  );
}

function readText(file) {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function Chevron() {
  return (
    <svg className="chev" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M1.5 1.5L7 7l-5.5 5.5" />
    </svg>
  );
}

export default function Settings({ scores, quick, focus, checkins, navigate }) {
  const [importError, setImportError] = useState("");
  const installPrompt = useInstallPrompt();
  const noteId = useId();
  const badCopies = useMemo(() => readBadCopies(), []);
  const hasBad = Object.keys(badCopies).length > 0;

  // Built from what is in memory, so it works when the browser blocks storage.
  const snapshot = () =>
    buildExport({
      scores: scores.scores,
      quick: quick.quick,
      focus: focus.focus,
      checkins: checkins.checkins,
    });
  const hasData =
    Object.keys(scores.scores || {}).length > 0 ||
    Object.keys(quick.quick || {}).length > 0 ||
    Boolean(focus.focus) ||
    (checkins.checkins || []).length > 0;

  const onExport = () => {
    saveJson(`life-improver-${toLocalDate()}.json`, snapshot());
  };

  const onExportBad = () => {
    saveJson(`life-improver-damaged-${toLocalDate()}.json`, {
      app: "life-improver",
      kind: "damaged-copy",
      savedAt: new Date().toISOString(),
      copies: badCopies,
    });
  };

  const onImport = async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    setImportError("");
    try {
      const text = await readText(file);
      // Nothing here to lose, so nothing to confirm.
      if (hasData && !window.confirm("Replace all data on this device with the imported file?")) return;
      const restored = importData(text);
      finishRestore(restored.checkins.length);
    } catch (err) {
      setImportError(err && err.message ? err.message : "This file could not be imported.");
    } finally {
      input.value = "";
    }
  };

  const onReset = () => {
    if (!window.confirm("Erase every score, check-in and your current focus from this device? This cannot be undone.")) return;
    scores.reset();
    quick.reset();
    focus.clearFocus();
    checkins.reset();
    navigate("/welcome");
  };

  const onInstall = async () => {
    const ev = installPrompt;
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } catch {
      // The browser declined to show the prompt; nothing to do.
    }
    installEvent = null;
    notifyInstall();
  };

  return (
    <div className="set">
      <div className="set-head">
        <h2 className="t-large">Settings &amp; privacy</h2>
        <p className="t-sub">Your garden stays with you. Keep a copy, or begin again.</p>
      </div>

      <section aria-labelledby="set-data">
        <h3 className="t-eyebrow list-title" id="set-data">Your data</h3>
        <div className="list">
          <button type="button" className="row set-act" onClick={onExport}>Download a copy</button>
          {hasBad && (
            <button type="button" className="row set-act" onClick={onExportBad}>Download the damaged copy</button>
          )}
          <div className="row set-file">
            <label className="set-act set-file-label">
              Restore from a copy
              <input
                className="sr-only"
                type="file"
                accept=".json,application/json"
                aria-describedby={noteId}
                onChange={onImport}
              />
            </label>
            <span id={noteId} className="t-foot">(.json file)</span>
          </div>
        </div>
        <p className="t-foot set-foot">
          Save everything to a file you can keep, or bring a saved copy back onto this device.
          {hasBad && " Some saved data could not be read, and a copy of it was kept."}
        </p>
        {importError && <p className="set-err" role="alert">{importError}</p>}
      </section>

      <section aria-labelledby="set-install">
        <h3 className="t-eyebrow list-title" id="set-install">Install the app</h3>
        {installPrompt ? (
          <>
            <div className="list">
              <button type="button" className="row set-act" onClick={onInstall}>Install</button>
            </div>
            <p className="t-foot set-foot">Keep Life Improver on your home screen, one tap away.</p>
          </>
        ) : (
          <div className="cd">
            <p className="t-sub">
              To keep Life Improver on your home screen, choose &ldquo;Add to Home Screen&rdquo; from your browser&rsquo;s share menu.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="set-explore">
        <h3 className="t-eyebrow list-title" id="set-explore">Explore</h3>
        <div className="list">
          <a className="row" href={href("/framework")}>
            <span>Framework</span>
            <Chevron />
          </a>
          <a className="row" href={href("/sources")}>
            <span>Sources</span>
            <Chevron />
          </a>
        </div>
        <p className="t-foot set-foot">The seven grounds of a life, and the work they rest on.</p>
      </section>

      <section aria-labelledby="set-privacy">
        <h3 className="t-eyebrow list-title" id="set-privacy">Privacy</h3>
        <div className="cd">
          <p className="t-sub">
            No accounts, no server, no tracking. Your data lives in this browser, on this device, and nowhere else. Clearing your browser&rsquo;s site data will erase it, so download a copy now and then.
          </p>
        </div>
      </section>

      <section aria-labelledby="set-medical">
        <h3 className="t-eyebrow list-title" id="set-medical">Not medical advice</h3>
        <div className="cd">
          <p className="t-sub">
            Life Improver offers reflection, not medical or psychological care. If you are in crisis, contact a professional or a local emergency number.
          </p>
        </div>
      </section>

      <section aria-labelledby="set-reset">
        <h3 className="t-eyebrow list-title" id="set-reset">Start over</h3>
        <div className="list">
          <button type="button" className="row set-danger" onClick={onReset}>Reset all data</button>
        </div>
        <p className="t-foot set-foot">
          Clear every score, check-in and your current focus from this device. Download a copy first if you may want them back.
        </p>
      </section>

      <section aria-labelledby="set-about">
        <h3 className="t-eyebrow list-title" id="set-about">About</h3>
        <div className="cd">
          <p className="t-sub">
            Built on the work of Aristotle, Frankl, Gottman, Maslow, Csikszentmihalyi, and the traditions that came before.
          </p>
        </div>
      </section>
    </div>
  );
}
