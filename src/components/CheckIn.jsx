import { useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { isoWeek, toLocalDate } from "../lib/dates.js";
import { changeSinceFirst, hasCheckinThisWeek, seriesFor } from "../lib/trends.js";
import { nextPractice } from "../lib/recommend.js";
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
function rewardLine(change) {
  if (change === null) return "A first mark on the page. Now there is a line to follow.";
  if (change > 0) return "Higher than where you began. Notice what helped.";
  if (change < 0) return "Lower than where you began. That is honest information, not a verdict.";
  return "Steady. Holding level is its own kind of ground.";
}

function Segmented({ legend, name, options, value, onChange, className = "" }) {
  return (
    <fieldset className={`ci-q ${className}`} role="radiogroup">
      <legend className="ci-legend">{legend}</legend>
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

export default function CheckIn({ scores, focus, checkins, navigate }) {
  const f = focus.focus;
  const domain = f ? FRAMEWORK.find((d) => d.id === f.domainId) : null;
  const sub = domain ? domain.subs[f.subIndex] : null;

  const [practised, setPractised] = useState(null);
  const [score, setScore] = useState(() => (sub ? scores.get(f.domainId, f.subIndex) : null));
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);

  if (!f || !sub) {
    return (
      <div className="cd" style={{ textAlign: "center", padding: 40 }}>
        <h2 className="sf" style={{ fontSize: "var(--fs-title)", fontWeight: 400, color: "#1A1A1A", marginBottom: 8 }}>
          Weekly check-in
        </h2>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
          A check-in looks back at one practice. Choose a focus, and come back when the week has had its say.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate("/")}>
          Choose a focus first
        </button>
      </div>
    );
  }

  const practice = sub.ideas[f.practiceIndex];
  const today = toLocalDate();
  const already = hasCheckinThisWeek(checkins.checkins, today);
  const ready = practised !== null && score !== null;

  const save = (e) => {
    e.preventDefault();
    if (!ready) return;
    const entry = {
      id: new Date().toISOString(),
      date: today,
      week: isoWeek(),
      domainId: f.domainId,
      subIndex: f.subIndex,
      practiceIndex: f.practiceIndex,
      practised,
      score,
      note: note.trim(),
    };
    checkins.addCheckin(entry);
    scores.set(f.domainId, f.subIndex, score);
    // Hook state updates asynchronously, so build the series from the list we know.
    const updated = [...checkins.checkins, entry];
    setResult({ score, updated, series: seriesFor(updated, f.domainId, f.subIndex) });
  };

  if (result) {
    const change = changeSinceFirst(result.series);
    const swap = () => {
      focus.setFocus(nextPractice(f, FRAMEWORK, result.updated, today));
      navigate("/");
    };
    return (
      <div className="cd ci-reward" style={{ textAlign: "center", padding: "32px 20px" }}>
        <h2 className="sf" style={{ fontSize: "var(--fs-title)", fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>
          Check-in saved
        </h2>
        <p className="sf" style={{ fontSize: "var(--fs-lead)", color: "#1A1A1A", maxWidth: 420, margin: "0 auto 20px" }}>
          {rewardLine(change)}
        </p>
        <p style={{ fontSize: 13, color: "#888" }}>{sub.name}</p>
        <p className="sf" style={{ fontSize: "var(--fs-display)", lineHeight: 1.1, color: "#2B6CB0" }}>
          {result.score}
        </p>
        <p style={{ fontSize: 12, color: "#888" }}>out of 10</p>
        {change !== null && (
          <p style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
            {formatChange(change)} since your first check-in
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 24px" }}>
          <Sparkline series={result.series} width={200} height={48} label={sub.name} />
        </div>
        <div className="ci-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/")}>
            Keep this practice
          </button>
          <button type="button" className="btn" onClick={swap}>
            Swap practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} aria-labelledby="ci-title">
      <h2 id="ci-title" className="sf" style={{ fontSize: "var(--fs-title)", fontWeight: 400, color: "#1A1A1A", marginBottom: 12 }}>
        Weekly check-in
      </h2>

      <div className="cd" style={{ borderLeft: "3px solid #2B6CB0" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {domain.domain}
        </p>
        <p style={{ fontWeight: 600, fontSize: 16, color: "#1A1A1A", margin: "2px 0 6px" }}>{sub.name}</p>
        <p className="sf" style={{ fontSize: 15, color: "#333" }}>{practice}</p>
      </div>

      {already && (
        <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          You already checked in this week. A new entry adds to it.
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

        <fieldset className="ci-q ci-scale" role="radiogroup">
          <legend className="ci-legend">How is {sub.name} now?</legend>
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
          <div className="ci-ends" aria-hidden="true">
            <span>Neglected</span>
            <span>Thriving</span>
          </div>
        </fieldset>

        <div className="ci-q">
          <label htmlFor="ci-note" className="ci-legend">
            A note, if you like <span style={{ color: "#888", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="ci-note"
            className="input"
            rows={3}
            maxLength={MAX_NOTE}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What helped, what got in the way."
          />
          <p style={{ fontSize: 12, color: "#888", textAlign: "right", marginTop: 4 }}>
            {note.length}/{MAX_NOTE}
          </p>
        </div>
      </div>

      <div className="ci-actions">
        <button type="submit" className="btn btn-primary" disabled={!ready}>
          Save check-in
        </button>
      </div>
    </form>
  );
}
