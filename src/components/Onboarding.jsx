import { useEffect, useRef, useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { useToday } from "../hooks/useToday.js";
import { makeFocus, suggestFocus, suggestPractice } from "../lib/recommend.js";
import { clearDraft, importData, readDraft, writeDraft } from "../lib/storage.js";
import { finishRestore } from "../lib/notice.js";
import FocusPicker from "./FocusPicker.jsx";

// Enough to find a place to begin; the rest can wait for the full assessment.
const MIN_RATED = 4;

const firstSentence = (text) => {
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : text;
};

const SLIDER_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

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
  const pickerWasOpen = useRef(false);
  const today = useToday();

  // Move focus to the new step's heading so screen readers follow along.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  // The picker moves focus to its own heading when it opens; when it closes,
  // hand focus back to "Choose another".
  useEffect(() => {
    if (picking) {
      pickerWasOpen.current = true;
    } else if (pickerWasOpen.current) {
      pickerWasOpen.current = false;
      chooseRef.current?.focus();
    }
  }, [picking]);

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
      setRestoreError(err && err.message ? err.message : "This file could not be restored.");
    } finally {
      input.value = "";
    }
  };

  return (
    <div className="wl">
      {step > 1 && <p className="wl-step">{step} of 3</p>}

      {step === 1 && (
        <section className="cd wl-hero">
          <p className="wl-eyebrow">Life Improver</p>
          <h2 className="sf wl-title" tabIndex={-1} ref={headingRef}>Your whole life.<br />In one view.</h2>
          <p className="sf wl-lead">
            Name how seven grounds of life feel today, and we will suggest one practice to tend this week.
          </p>
          <p className="wl-privacy">Everything stays on this device.</p>
          <div className="wl-actions">
            <button type="button" className="btn btn-primary btn-tap" onClick={() => go(2)}>
              Begin
            </button>
          </div>
          <p className="wl-restore">
            <label className="wl-link wl-file">
              I have a saved copy
              <input className="sr-only" type="file" accept=".json,application/json" onChange={onRestore} />
            </label>
          </p>
          {restoreError && <p className="wl-err" role="alert">{restoreError}</p>}
        </section>
      )}

      {step === 2 && (
        <section className="cd">
          <h2 className="sf wl-title" tabIndex={-1} ref={headingRef}>How does each ground feel?</h2>
          <p className="wl-muted" id="wl-help">
            Move each slider to where you honestly stand. Rate at least {MIN_RATED} to continue.
            Leave the others for later.
          </p>
          <ul className="wl-list">
            {FRAMEWORK.map((d) => {
              const v = draft[d.id];
              const inputId = `wl-q-${d.id}`;
              return (
                <li key={d.id} className="wl-item">
                  <label htmlFor={inputId} className="wl-name">{d.domain}</label>
                  <p className="wl-desc" id={`${inputId}-d`}>{firstSentence(d.desc)}</p>
                  <div className="wl-row">
                    <input
                      id={inputId}
                      type="range"
                      min="1"
                      max="10"
                      value={v ?? 5}
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
                    <output htmlFor={inputId} className="wl-val">{v ?? "Not rated"}</output>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="wl-muted" role="status">{rated} of 7 rated.</p>
          <div className="wl-actions">
            <button type="button" className="btn btn-tap" onClick={() => go(1)}>Back</button>
            <button
              type="button"
              className="btn btn-primary btn-tap"
              disabled={rated < MIN_RATED}
              aria-describedby="wl-help"
              onClick={() => go(3)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 3 && sub && !needsRatings && (
        <section className="cd fc">
          <h2 className="sf wl-title" tabIndex={-1} ref={headingRef}>A place to begin</h2>
          <p className="fc-eyebrow">{domain.domain}</p>
          <h3 className="sf fc-title">{sub.name}</h3>
          <p className="sf fc-practice">{sub.ideas[practiceIndex]}</p>
          <p className="today-muted">{pick ? "You chose this place to begin." : suggested.reason}</p>
          <div className="wl-actions">
            <button type="button" className="btn btn-tap" onClick={() => go(2)}>Back</button>
            <button
              type="button"
              className="btn btn-tap"
              ref={chooseRef}
              hidden={picking}
              aria-expanded={picking}
              onClick={() => setPicking(true)}
            >
              Choose another
            </button>
            <button type="button" className="btn btn-primary btn-tap" onClick={plant}>
              Plant this seed
            </button>
          </div>
          {picking && (
            <FocusPicker
              scores={scores}
              quickScores={draft}
              current={chosen}
              onPick={(domainId, subIndex) => { setPick({ domainId, subIndex }); setPicking(false); }}
              onClose={() => setPicking(false)}
            />
          )}
        </section>
      )}

      <p className="wl-skip">
        <button type="button" className="wl-link" onClick={() => navigate("/assess")}>
          Skip to the full assessment
        </button>
      </p>
    </div>
  );
}
