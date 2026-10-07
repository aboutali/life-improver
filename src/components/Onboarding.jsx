import { useEffect, useRef, useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { toLocalDate } from "../lib/dates.js";
import { suggestFocus, suggestPractice } from "../lib/recommend.js";
import FocusPicker from "./FocusPicker.jsx";

// Enough to find a place to begin; the rest can wait for the full assessment.
const MIN_RATED = 4;

const firstSentence = (text) => {
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : text;
};

export default function Onboarding({ scores, quick, focus, checkins, navigate }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({}); // { domainId: 1..10 }, only rated domains
  const [pick, setPick] = useState(null); // { domainId, subIndex } chosen by hand
  const [picking, setPicking] = useState(false);
  const headingRef = useRef(null);
  const mounted = useRef(false);

  // Move focus to the new step's heading so screen readers follow along.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  const rated = Object.keys(draft).length;
  const go = (n) => { setPicking(false); setStep(n); };

  const suggested = step === 3
    ? suggestFocus({ scores: scores.scores, quick: draft })
    : null;
  const chosen = pick || suggested;
  const today = toLocalDate();
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
    Object.entries(draft).forEach(([id, v]) => quick.setQuick(Number(id), v));
    focus.setFocus({
      domainId: chosen.domainId,
      subIndex: chosen.subIndex,
      practiceIndex,
      startedAt: today,
      skipped: [],
    });
    navigate("/");
  };

  return (
    <div className="wl">
      <p className="wl-step">{step} of 3</p>

      {step === 1 && (
        <section className="cd">
          <h2 className="sf wl-title" tabIndex={-1} ref={headingRef}>Begin where you are.</h2>
          <p className="sf wl-lead">
            Seven grounds make up a life. Name how each one feels today, and we will
            suggest a single practice to tend this week.
          </p>
          <p className="wl-privacy">Everything stays on this device.</p>
          <div className="wl-actions">
            <button type="button" className="btn btn-primary btn-tap" onClick={() => go(2)}>
              Begin
            </button>
          </div>
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
                      onChange={(e) => setDraft((p) => ({ ...p, [d.id]: Number(e.target.value) }))}
                      onPointerUp={(e) => {
                        const val = Number(e.currentTarget.value);
                        setDraft((p) => (p[d.id] ? p : { ...p, [d.id]: val }));
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

      {step === 3 && sub && (
        <section className="cd fc">
          <h2 className="sf wl-title" tabIndex={-1} ref={headingRef}>A place to begin</h2>
          <p className="fc-eyebrow">{domain.domain}</p>
          <h3 className="sf fc-title">{sub.name}</h3>
          <p className="sf fc-practice">{sub.ideas[practiceIndex]}</p>
          <p className="today-muted">{pick ? "A place you chose to begin." : suggested.reason}</p>
          <div className="wl-actions">
            <button type="button" className="btn btn-tap" onClick={() => go(2)}>Back</button>
            {!picking && (
              <button type="button" className="btn btn-tap" onClick={() => setPicking(true)}>
                Choose another
              </button>
            )}
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
