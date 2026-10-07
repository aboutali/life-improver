import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { buildExport, importData, readBadCopies } from "../lib/storage.js";
import { finishRestore } from "../lib/notice.js";
import { saveJson } from "../lib/download.js";
import { toLocalDate } from "../lib/dates.js";

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
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="sf" style={{ fontSize: "var(--fs-h1)", fontWeight: 400, color: "#1A1A1A", marginBottom: 8 }}>
          Settings &amp; privacy
        </h2>
        <p className="sf" style={{ fontSize: "var(--fs-lead)", color: "#444" }}>
          Your garden stays with you. Keep a copy, or begin again.
        </p>
      </div>

      <section className="cd" aria-labelledby="set-data">
        <h3 className="set-h" id="set-data">Your data</h3>
        <p className="set-p">
          Save everything to a file you can keep, or bring a saved copy back onto this device.
        </p>
        <div className="set-row">
          <button type="button" className="btn btn-primary set-btn" onClick={onExport}>Download a copy</button>
        </div>
        {hasBad && (
          <>
            <p className="set-p" style={{ marginTop: 14 }}>
              Some saved data could not be read, and a copy of it was kept.
            </p>
            <div className="set-row">
              <button type="button" className="btn set-btn" onClick={onExportBad}>Download the damaged copy</button>
            </div>
          </>
        )}
        <div className="set-row" style={{ marginTop: 12 }}>
          <label className="btn set-btn set-restore">
            Restore from a copy
            <input
              className="sr-only"
              type="file"
              accept=".json,application/json"
              aria-describedby={noteId}
              onChange={onImport}
            />
          </label>
          <span id={noteId} className="set-note">(.json file)</span>
        </div>
        {importError && <p className="set-err" role="alert">{importError}</p>}
      </section>

      <section className="cd" aria-labelledby="set-install">
        <h3 className="set-h" id="set-install">Install the app</h3>
        {installPrompt ? (
          <>
            <p className="set-p">Keep Life Improver on your home screen, one tap away.</p>
            <button type="button" className="btn set-btn" onClick={onInstall}>Install</button>
          </>
        ) : (
          <p className="set-p" style={{ marginBottom: 0 }}>
            To keep Life Improver on your home screen, choose &ldquo;Add to Home Screen&rdquo; from your browser&rsquo;s share menu.
          </p>
        )}
      </section>

      <section className="cd" aria-labelledby="set-reset">
        <h3 className="set-h" id="set-reset">Start over</h3>
        <p className="set-p">
          Clear every score, check-in and your current focus from this device. Download a copy first if you may want them back.
        </p>
        <button type="button" className="btn btn-danger set-btn" onClick={onReset}>Reset all data</button>
      </section>

      <section className="cd" aria-labelledby="set-privacy">
        <h3 className="set-h" id="set-privacy">Privacy</h3>
        <p className="set-p" style={{ marginBottom: 0 }}>
          No accounts, no server, no tracking. Your data lives in this browser, on this device, and nowhere else. Clearing your browser&rsquo;s site data will erase it, so download a copy now and then.
        </p>
      </section>

      <section className="cd" aria-labelledby="set-medical">
        <h3 className="set-h" id="set-medical">Not medical advice</h3>
        <p className="set-p" style={{ marginBottom: 0 }}>
          Life Improver offers reflection, not medical or psychological care. If you are in crisis, contact a professional or a local emergency number.
        </p>
      </section>
    </div>
  );
}
