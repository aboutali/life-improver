import { useEffect, useRef, useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { isoWeek } from "../lib/dates.js";
import { useToday } from "../hooks/useToday.js";
import { changeSinceFirst, hasCheckinThisWeek, seriesFor } from "../lib/trends.js";
import { nextPractice } from "../lib/recommend.js";
import { isNewcomer, nextCheckinLabel } from "../lib/journey.js";
import { isCheckinOpen } from "../lib/rhythm.js";
import { href } from "../lib/router.js";
import Sparkline from "./Sparkline.jsx";

const MAX_NOTE = 500;

const PRACTISED = [
  { value: "yes", label: "Yes" },
  { value: "some", label: "Some" },
  { value: "no", label: "Not this week" },
];

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

function formatChange(change) {
  if (change === null) return null;
  if (change > 0) return `+${change}`;
  if (change < 0) return `−${Math.abs(change)}`;
  return "±0";
}

// A gentle line for each outcome. Never shaming.
function rewardLine(change, practised) {
  if (practised === "no") return "A week without it happens. Smaller is fine.";
  if (change === null) return "A first mark on the page. Now there is a line to follow.";
  if (change > 0) return "Higher than where you began. Notice what helped.";
  if (change < 0) return "Lower than where you began. That is honest information, not a verdict.";
  return "Steady. Holding level is its own kind of ground.";
}

function Segmented({ legend, name, options, value, onChange, className = "" }) {
  return (
    <fieldset className={`ci-q ${className}`} role="radiogroup">
      <legend className="ci-legend t-head">{legend}</legend>
      <div className="ci-seg">
        {options.map((o) => (
          <label key={o.value} className="ci-opt">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// The reward view takes focus on mount so the save is announced and the
// keyboard is not left on a button that has just disappeared.
function Reward({ result, sub, today, onKeep, onSwap }) {
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const change = changeSinceFirst(result.series);
  return (
    <div className="ci-reward">
      <h2 className="t-large" tabIndex={-1} ref={headingRef}>
        Check-in saved
      </h2>
      <p className="t-sub ci-reward-line">{rewardLine(change, result.practised)}</p>
      <div className="cd ci-reward-card">
        <p className="t-eyebrow">{sub.name}</p>
        <p className="sf ci-score">{result.score}</p>
        <p className="t-foot">out of 10</p>
        {change !== null && (
          <p className="t-sub ci-change">{formatChange(change)} since your first check-in</p>
        )}
        <div className="ci-spark">
          <Sparkline series={result.series} width={240} height={56} label={sub.name} />
        </div>
      </div>
      <p className="t-foot ci-next">Next check-in: {nextCheckinLabel(today)}</p>
      <div className="ci-reward-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onKeep}>
          Keep this practice
        </button>
        <button type="button" className="btn btn-block" onClick={onSwap}>
          {result.practised === "no" ? "Try a smaller practice" : "Try a different practice"}
        </button>
      </div>
    </div>
  );
}

export default function CheckIn({ scores, quick, focus, checkins, navigate }) {
  const f = focus.focus;
  const domain = f ? FRAMEWORK.find((d) => d.id === f.domainId) : null;
  const sub = domain ? domain.subs[f.subIndex] : null;
  const today = useToday();

  const [practised, setPractised] = useState(null);
  const [score, setScore] = useState(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);

  const newcomer = isNewcomer(quick?.quick, scores.scoredCount);

  if (!f || !sub) {
    return (
      <div className="ci-empty">
        <h2 className="t-large" tabIndex={-1}>Weekly check-in</h2>
        <p className="t-sub">
          {newcomer
            ? "There is nothing to check in on yet. A one-minute welcome sets your first focus."
            : "A check-in looks back at one practice. Choose a focus, and come back when the week has had its say."}
        </p>
        {newcomer ? (
          <a href="#/welcome" className="btn btn-primary">
            Begin with a one-minute welcome
          </a>
        ) : (
          <a href="#/" className="btn btn-primary">
            Choose a focus first
          </a>
        )}
      </div>
    );
  }

  // A stored index can outlive an edit to the framework: fall back to the first practice.
  const practiceIndex =
    Number.isInteger(f.practiceIndex) && f.practiceIndex >= 0 && f.practiceIndex < sub.ideas.length
      ? f.practiceIndex
      : 0;
  const practice = sub.ideas[practiceIndex];
  const already = hasCheckinThisWeek(checkins.checkins, today);
  const lastScore =
    scores.get(f.domainId, f.subIndex) ??
    seriesFor(checkins.checkins, f.domainId, f.subIndex).at(-1)?.score ??
    null;
  const ready = practised !== null && score !== null;

  const save = (e) => {
    e.preventDefault();
    if (!ready) return;
    const entry = {
      id: new Date().toISOString(),
      date: today,
      week: isoWeek(today),
      domainId: f.domainId,
      subIndex: f.subIndex,
      practiceIndex,
      practised,
      score,
      note: note.trim(),
    };
    checkins.addCheckin(entry);
    scores.set(f.domainId, f.subIndex, score);
    // Hook state updates asynchronously, so build the series from the list we know.
    const updated = [...checkins.checkins, entry];
    setResult({ score, practised, updated, series: seriesFor(updated, f.domainId, f.subIndex) });
  };

  if (result) {
    return (
      <Reward
        result={result}
        sub={sub}
        today={today}
        onKeep={() => navigate("/")}
        onSwap={() => {
          focus.setFocus(nextPractice({ ...f, practiceIndex }, FRAMEWORK, result.updated, today));
          navigate("/");
        }}
      />
    );
  }

  return (
    <form onSubmit={save} aria-labelledby="ci-title" className="ci">
      <h2 id="ci-title" className="t-large" tabIndex={-1}>
        Weekly check-in
      </h2>

      <div className="cd ci-focus">
        <p className="t-eyebrow">{domain.domain}</p>
        <p className="t-head">{sub.name}</p>
        <p className="sf t-sub">{practice}</p>
      </div>

      {already && (
        <p className="t-sub ci-aside">
          You already checked in this week. A new entry adds to it.{" "}
          <a href={href("/")} className="btn-text">Back to Today</a>
        </p>
      )}
      {!isCheckinOpen(f, today) && (
        <p className="t-sub ci-aside">
          You started recently. Check in early only if you like.
        </p>
      )}

      <div className="cd">
        <Segmented
          legend="Did you practise this week?"
          name="practised"
          options={PRACTISED}
          value={practised}
          onChange={setPractised}
        />
      </div>

      <div className="cd">
        <fieldset
          className="ci-q ci-scale"
          role="radiogroup"
          aria-describedby={lastScore ? "ci-last" : undefined}
        >
          <legend className="ci-legend t-head">How is {sub.name} now?</legend>
          {lastScore && (
            <p id="ci-last" className="t-foot ci-last">
              Last time: {lastScore}
            </p>
          )}
          <div className="ci-scores">
            {SCORES.map((n) => (
              <label key={n} className="ci-opt">
                <input
                  type="radio"
                  name="score"
                  value={n}
                  checked={score === n}
                  onChange={() => setScore(n)}
                />
                <span>{n}</span>
              </label>
            ))}
          </div>
          <div className="ci-ends t-foot" aria-hidden="true">
            <span>Neglected</span>
            <span>Thriving</span>
          </div>
        </fieldset>
      </div>

      <div className="cd">
        <div className="ci-q">
          <label htmlFor="ci-note" className="ci-legend t-head">
            A note, if you like <span className="t-foot">(optional)</span>
          </label>
          <textarea
            id="ci-note"
            className="input ci-note"
            rows={3}
            maxLength={MAX_NOTE}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What helped, what got in the way."
          />
          <p className="t-foot ci-count">
            {note.length}/{MAX_NOTE}
          </p>
        </div>
      </div>

      <div className="action-bar">
        {!ready && (
          <p id="ci-hint" className="t-foot ci-hint">
            Answer the first two questions to save.
          </p>
        )}
        <button
          type="submit"
          className="btn btn-primary btn-block ci-save"
          disabled={!ready}
          aria-describedby={ready ? undefined : "ci-hint"}
        >
          Save check-in
        </button>
      </div>
    </form>
  );
}
