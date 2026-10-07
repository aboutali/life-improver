import { useId, useState, useSyncExternalStore } from "react";
import { exportData, importData } from "../lib/storage.js";
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

function saveJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Settings({ scores, quick, focus, checkins, navigate }) {
  const [importError, setImportError] = useState("");
  const installPrompt = useInstallPrompt();
  const fileId = useId();

  const onExport = () => {
    saveJson(`life-improver-${toLocalDate()}.json`, exportData());
  };

  const onImport = async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    setImportError("");
    try {
      const text = await readText(file);
      if (!window.confirm("Replace all data on this device with the imported file?")) return;
      importData(text);
      window.location.reload();
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
          Save everything to a file you can keep, or bring a saved file back onto this device.
        </p>
        <div className="set-row">
          <button type="button" className="btn btn-primary set-btn" onClick={onExport}>Export JSON</button>
        </div>
        <label className="set-file" htmlFor={fileId}>Import a saved JSON file</label>
        <input
          id={fileId}
          className="set-input"
          type="file"
          accept=".json,application/json"
          onChange={onImport}
        />
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
          Clear every score, check-in and your current focus from this device. Export first if you may want them back.
        </p>
        <button type="button" className="btn btn-danger set-btn" onClick={onReset}>Reset all data</button>
      </section>

      <section className="cd" aria-labelledby="set-privacy">
        <h3 className="set-h" id="set-privacy">Privacy</h3>
        <p className="set-p" style={{ marginBottom: 0 }}>
          No accounts, no server, no tracking. Your data lives in this browser, on this device, and nowhere else. Clearing your browser&rsquo;s site data will erase it, so export a copy now and then.
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
