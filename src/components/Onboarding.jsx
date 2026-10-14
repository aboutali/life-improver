import { useEffect, useRef, useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { useToday } from "../hooks/useToday.js";
import { makeFocus, suggestFocus, suggestPractice } from "../lib/recommend.js";
import { clearDraft, importData, readDraft, writeDraft } from "../lib/storage.js";
import { finishRestore } from "../lib/notice.js";
import { FocusPickerSheet } from "./FocusPicker.jsx";
import { showHud } from "./showHud.jsx";

// Enough to find a place to begin; the rest can wait for the full assessment.
const MIN_RATED = 4;

const firstSentence = (text) => {
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : text;
};

const SLIDER_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

const RESTORE_HINT = "Use the .json file from Settings, Download a copy.";

const STEP_PATHS = ["/welcome", "/welcome/rate", "/welcome/focus"];

function readText(file) {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// The app icon (public/icon.svg), drawn inline as a rounded square.
function AppGlyph() {
  return (
    <svg className="wl-glyph" width="72" height="72" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="115" fill="var(--accent-fill)" />
      <path d="M256 396 V252" fill="none" stroke="var(--on-accent)" strokeWidth="14" strokeLinecap="round" />
      <path d="M256 276 C256 206 206 160 128 160 C128 232 176 276 256 276 Z" fill="var(--on-accent)" />
      <path d="M256 236 C256 176 296 136 364 136 C364 198 322 236 256 236 Z" fill="var(--on-accent)" />
      <path d="M200 396 H312" fill="none" stroke="var(--on-accent)" strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
}

export default function Onboarding({ scores, quick, focus, checkins, navigate, path = "/welcome" }) {
  // The step comes from the route, so the browser's Back button moves between steps.
  const step = Math.max(1, STEP_PATHS.indexOf(path) + 1);
  // Ratings wait in sessionStorage until the seed is planted, so a reload keeps them.
  const [initial] = useState(readDraft);
  const [draft, setDraft] = useState(initial.quick); // { domainId: 1..10 }, only rated domains
  const [pick, setPick] = useState(initial.pick); // { domainId, subIndex } chosen by hand
  const [picking, setPicking] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const planted = useRef(false);
  const headingRef = useRef(null);
  const mounted = useRef(false);
  const chooseRef = useRef(null);
  const today = useToday();

  // Move focus to the new step's heading so screen readers follow along.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  useEffect(() => {
    if (!planted.current) writeDraft({ quick: draft, pick });
  }, [draft, pick]);

  const rated = Object.keys(draft).length;
  // A direct visit to the last step without enough ratings goes back to rating.
  const needsRatings = step === 3 && rated < MIN_RATED;
  useEffect(() => {
    if (needsRatings) navigate("/welcome/rate", { replace: true, quiet: true });
  }, [needsRatings, navigate]);

  // A range input shows 5 before it is touched and fires no change event for
  // it, so a pointer or key interaction also records the value it rests on.
  const record = (id, raw) => {
    const val = Number(raw);
    if (!draft[id]) {
      setDraft((p) => (p[id] ? p : { ...p, [id]: val }));
      setPick(null);
    }
  };
  // Any rating change makes a hand-picked focus stale: the suggestion returns.
  const rateDomain = (id, raw) => {
    setDraft((p) => ({ ...p, [id]: Number(raw) }));
    setPick(null);
  };
  const go = (n) => { setPicking(false); navigate(STEP_PATHS[n - 1]); };

  const suggested = step === 3 && !needsRatings
    ? suggestFocus({ scores: scores.scores, quick: draft })
    : null;
  const chosen = pick || suggested;
  const domain = chosen && FRAMEWORK.find((d) => d.id === chosen.domainId);
  const sub = domain && domain.subs[chosen.subIndex];
  const practiceIndex = chosen
    ? suggestPractice({
        framework: FRAMEWORK,
        domainId: chosen.domainId,
        subIndex: chosen.subIndex,
        checkins: checkins.checkins,
        skipped: [],
        today,
      }).practiceIndex
    : 0;

  const plant = () => {
    planted.current = true;
    clearDraft();
    Object.entries(draft).forEach(([id, v]) => quick.setQuick(Number(id), v));
    focus.setFocus(
      makeFocus({
        domainId: chosen.domainId,
        subIndex: chosen.subIndex,
        practiceIndex,
        origin: pick ? "picked" : "suggested",
        today,
        checkins: checkins.checkins,
      })
    );
    showHud("Focus set");
    navigate("/");
  };

  const onRestore = async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    setRestoreError("");
    try {
      const { checkins: restored } = importData(await readText(file));
      finishRestore(restored.length);
    } catch (err) {
      const msg = err && err.message ? err.message : "This file could not be restored.";
      setRestoreError(`${msg} ${RESTORE_HINT}`);
    } finally {
      input.value = "";
    }
  };

  const stepDots = (
    <div className="wl-steps">
      <span className="t-foot wl-step">{step} of 3</span>
      <span className="wl-dots" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`wl-dot${n <= step ? " on" : ""}`} />
        ))}
      </span>
    </div>
  );

  return (
    <div className={`wl wl-s${step}`}>
      {step > 1 && stepDots}

      {step === 1 && (
        <section className="wl-hero">
          <div className="wl-hero-body">
            <AppGlyph />
            <p className="t-eyebrow wl-eyebrow">Life Improver</p>
            <h2 className="sf t-large wl-title" tabIndex={-1} ref={headingRef}>Your whole life.<br />In one view.</h2>
            <p className="sf wl-lead">
              Name how seven grounds of life feel today, and we will suggest one practice to tend this week.
            </p>
            <p className="t-sub wl-privacy">Everything stays on this device.</p>
          </div>
          <div className="wl-aside">
            <label className="btn-text wl-file">
              Restore from a saved copy
              <input className="sr-only" type="file" accept=".json,application/json" onChange={onRestore} />
            </label>
            {restoreError && <p className="wl-err" role="alert">{restoreError}</p>}
            <button type="button" className="btn-text" onClick={() => navigate("/assess")}>
              Skip to the full assessment
            </button>
          </div>
        </section>
      )}
      {step === 1 && (
        <div className="action-bar">
          <button type="button" className="btn btn-primary" onClick={() => go(2)}>
            Begin
          </button>
        </div>
      )}

      {step === 2 && (
        <section className="wl-body">
          <h2 className="t-large wl-title" tabIndex={-1} ref={headingRef}>How does each ground feel?</h2>
          <p className="t-sub wl-help" id="wl-help">
            Move each slider to where you honestly stand. Rate at least {MIN_RATED} to continue.
            Leave the others for later.
          </p>
          <ul className="list wl-list">
            {FRAMEWORK.map((d) => {
              const v = draft[d.id];
              const inputId = `wl-q-${d.id}`;
              return (
                <li key={d.id} className="row wl-item">
                  <div className="wl-head">
                    <label htmlFor={inputId} className="t-head wl-name">{d.domain}</label>
                    <output htmlFor={inputId} className={`wl-val${v ? " set" : ""}`}>{v ?? "Not rated"}</output>
                  </div>
                  <p className="t-foot wl-desc" id={`${inputId}-d`}>{firstSentence(d.desc)}</p>
                  <input
                    id={inputId}
                    type="range"
                    min="1"
                    max="10"
                    value={v ?? 5}
                    style={{ "--p": ((v ?? 5) - 1) / 9 }}
                    aria-describedby={`${inputId}-d`}
                    aria-valuetext={v ? `${v} out of 10` : "not rated"}
                    className={`wl-range${v ? "" : " unset"}`}
                    onChange={(e) => rateDomain(d.id, e.target.value)}
                    onPointerUp={(e) => record(d.id, e.currentTarget.value)}
                    onClick={(e) => record(d.id, e.currentTarget.value)}
                    onKeyUp={(e) => {
                      if (SLIDER_KEYS.includes(e.key)) record(d.id, e.currentTarget.value);
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <p className="wl-skip">
            <button type="button" className="btn-text" onClick={() => navigate("/assess")}>
              Skip to the full assessment
            </button>
          </p>
          <div className="action-bar">
            <p className="t-foot wl-count" role="status">{rated} of 7 rated.</p>
            <div className="wl-bar">
              <button type="button" className="btn" onClick={() => go(1)}>Back</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={rated < MIN_RATED}
                aria-describedby="wl-help"
                onClick={() => go(3)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 3 && sub && !needsRatings && (
        <section className="wl-body">
          <h2 className="t-large wl-title" tabIndex={-1} ref={headingRef}>A place to begin</h2>
          <div className="cd wl-seed">
            <p className="t-eyebrow wl-seed-eyebrow">{domain.domain}</p>
            <h3 className="sf t-title wl-seed-title">{sub.name}</h3>
            <p className="sf wl-seed-practice">{sub.ideas[practiceIndex]}</p>
            <p className="t-sub wl-reason">{pick ? "You chose this place to begin." : suggested.reason}</p>
          </div>
          <button
            type="button"
            className="btn btn-block wl-choose"
            ref={chooseRef}
            aria-haspopup="dialog"
            onClick={() => setPicking(true)}
          >
            Choose another
          </button>
          <FocusPickerSheet
            open={picking}
            onClose={() => setPicking(false)}
            returnFocusRef={chooseRef}
            scores={scores}
            quickScores={draft}
            current={chosen}
            onPick={(domainId, subIndex) => { setPick({ domainId, subIndex }); setPicking(false); }}
          />
          <p className="wl-skip">
            <button type="button" className="btn-text" onClick={() => navigate("/assess")}>
              Skip to the full assessment
            </button>
          </p>
          <div className="action-bar">
            <div className="wl-bar">
              <button type="button" className="btn" onClick={() => go(2)}>Back</button>
              <button type="button" className="btn btn-primary" onClick={plant}>
                Plant this seed
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
