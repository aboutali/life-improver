import { useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { parseLocalDate } from "../lib/dates.js";
import { changeSinceFirst, weeksActive } from "../lib/trends.js";
import { MAX_WEEKS, groupLogByWeek, isNewcomer, weeklySeriesFor } from "../lib/journey.js";
import Sparkline from "./Sparkline.jsx";

const PRACTISED_LABEL = { yes: "Practised", some: "Practised some", no: "Not this week" };

function formatChange(change) {
  if (change === null) return "New";
  if (change > 0) return `+${change}`;
  if (change < 0) return `−${Math.abs(change)}`;
  return "±0";
}

function formatDate(value) {
  return parseLocalDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function Journey({ scores, quick, checkins }) {
  const list = checkins.checkins;
  const [showAll, setShowAll] = useState(false);

  if (!list.length) {
    return (
      <div className="cd" style={{ textAlign: "center", padding: 40 }}>
        <h2 className="sf" style={{ fontSize: "var(--fs-title)", fontWeight: 400, color: "#1A1A1A", marginBottom: 8 }}>
          Journey
        </h2>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
          Nothing here yet. After your first weekly check-in, the line of your progress begins.
        </p>
        {isNewcomer(quick?.quick, scores?.scoredCount) ? (
          <a href="#/welcome" className="btn btn-primary jr-link">
            Begin with a one-minute welcome
          </a>
        ) : (
          <a href="#/checkin" className="btn btn-primary jr-link">
            Make a first check-in
          </a>
        )}
      </div>
    );
  }

  const rows = [];
  FRAMEWORK.forEach((d) => {
    d.subs.forEach((s, si) => {
      const series = weeklySeriesFor(list, d.id, si);
      if (series.length) rows.push({ key: `${d.id}-${si}`, domain: d.domain, sub: s.name, series });
    });
  });

  const weeks = groupLogByWeek(list);
  const shownWeeks = showAll ? weeks : weeks.slice(0, MAX_WEEKS);
  const nameOf = (c) => FRAMEWORK.find((d) => d.id === c.domainId)?.subs[c.subIndex]?.name ?? "Unknown practice area";
  const practiceOf = (c) => FRAMEWORK.find((d) => d.id === c.domainId)?.subs[c.subIndex]?.ideas[c.practiceIndex];

  return (
    <div>
      <h2 className="sf" style={{ fontSize: "var(--fs-title)", fontWeight: 400, color: "#1A1A1A", marginBottom: 4 }}>
        Journey
      </h2>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
        {plural(weeksActive(list), "week", "weeks")} active · {plural(list.length, "check-in", "check-ins")}
      </p>

      <div className="cd" style={{ padding: 0 }}>
        {rows.map((r) => {
          const latest = r.series[r.series.length - 1].score;
          const change = changeSinceFirst(r.series);
          return (
            <div key={r.key} className="jr-row">
              <div className="jr-name">
                <p className="jr-eyebrow">{r.domain}</p>
                <p style={{ fontWeight: 600, color: "#1A1A1A" }}>{r.sub}</p>
              </div>
              <Sparkline series={r.series} label={r.sub} />
              <div className="jr-nums">
                <span className="sf" style={{ fontSize: 22, color: "#1A1A1A" }}>
                  <span className="jr-vh">Latest score </span>{latest}
                </span>
                <span className={`jr-chip${change !== null && change > 0 ? " up" : ""}`}>
                  <span className="jr-vh">Change since first </span>{formatChange(change)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, margin: "24px 0 8px" }}>
        Log
      </h3>
      {shownWeeks.map((w) => (
        <section key={w.week} aria-labelledby={`jr-w-${w.week}`}>
          <h4 id={`jr-w-${w.week}`} className="jr-week">
            {w.heading}
          </h4>
          <ul className="cd" style={{ padding: 0, listStyle: "none" }}>
            {w.entries.map(({ checkin: c, later }) => (
              <li key={c.id} className="jr-log">
                <div className="jr-log-head">
                  <span style={{ color: "#666", fontSize: 13 }}>{formatDate(c.date)}</span>
                  <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{nameOf(c)}</span>
                  {later && <span className="jr-later">Added later</span>}
                </div>
                <p style={{ fontSize: 14, color: "#444" }}>
                  {PRACTISED_LABEL[c.practised] ?? c.practised} · Score {c.score}
                </p>
                {c.note && <p style={{ fontSize: 14, color: "#333", marginTop: 4, whiteSpace: "pre-wrap" }}>{c.note}</p>}
                {practiceOf(c) && <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{practiceOf(c)}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {weeks.length > MAX_WEEKS && (
        <button
          type="button"
          className="btn jr-more"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show fewer weeks" : "Show earlier weeks"}
        </button>
      )}
    </div>
  );
}
