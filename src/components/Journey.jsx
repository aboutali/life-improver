import { useRef, useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { parseLocalDate } from "../lib/dates.js";
import { changeSinceFirst, weeksActive } from "../lib/trends.js";
import { MAX_WEEKS, groupLogByWeek, isNewcomer, weeklySeriesFor } from "../lib/journey.js";
import { copyText } from "../lib/clipboard.js";
import { shortLabel } from "../lib/contextMenu.js";
import Sparkline from "./Sparkline.jsx";
import EmptyState from "./EmptyState.jsx";
import SwipeRow from "./SwipeRow.jsx";
import ContextMenu from "./ContextMenu.jsx";
import { confirmAction } from "./confirmAction.jsx";
import { showHud } from "./showHud.jsx";

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

export default function Journey({ scores, quick, checkins }) {
  const list = checkins.checkins;
  const [showAll, setShowAll] = useState(false);
  const titleRef = useRef(null);

  // Asks first, then removes the entry. Stats and charts follow from the list.
  const remove = async (c) => {
    const ok = await confirmAction({
      title: "Delete this check-in?",
      message: "It leaves your Journey and its line. This cannot be undone.",
      confirmLabel: "Delete check-in",
      destructive: true,
    });
    if (!ok) return;
    checkins.removeCheckin?.(c.id);
    showHud("Check-in deleted");
    // The row that held focus is gone; keep the person's place on the screen.
    window.requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  };

  const copyNote = async (c) => {
    if (await copyText(c.note)) showHud("Note copied");
    else showHud("Could not copy", { icon: "info" });
  };

  if (!list.length) {
    return (
      <div className="jr-empty">
        <h2 className="t-large">Journey</h2>
        <EmptyState
          icon="journey"
          title="Your line is waiting"
          action={
            isNewcomer(quick?.quick, scores?.scoredCount) ? (
              <a href="#/welcome" className="btn btn-primary">
                Begin with a one-minute welcome
              </a>
            ) : (
              <a href="#/checkin" className="btn btn-primary">
                Make a first check-in
              </a>
            )
          }
        >
          Nothing here yet. After your first weekly check-in, the line of your progress begins.
        </EmptyState>
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

  const weeksN = weeksActive(list);

  return (
    <div className="jr">
      <h2 className="t-large" ref={titleRef} tabIndex={-1}>Journey</h2>

      <div className="jr-stats">
        <div className="cd jr-stat">
          <span className="sf jr-stat-n">{weeksN}</span>
          <span className="t-foot">{weeksN === 1 ? "week active" : "weeks active"}</span>
        </div>
        <div className="cd jr-stat">
          <span className="sf jr-stat-n">{list.length}</span>
          <span className="t-foot">{list.length === 1 ? "check-in" : "check-ins"}</span>
        </div>
      </div>

      {rows.map((r) => {
        const latest = r.series[r.series.length - 1].score;
        const change = changeSinceFirst(r.series);
        return (
          <div key={r.key} className="cd jr-row">
            <div className="jr-top">
              <div className="jr-name">
                <p className="t-eyebrow">{r.domain}</p>
                <p className="t-head">{r.sub}</p>
              </div>
              <div className="jr-nums">
                <span className="sf jr-score">
                  <span className="sr-only">Latest score </span>{latest}
                </span>
                <span className={`jr-chip${change !== null && change > 0 ? " up" : ""}`}>
                  <span className="sr-only">Change since first </span>{formatChange(change)}
                </span>
              </div>
            </div>
            <Sparkline series={r.series} height={104} label={r.sub} detailed />
          </div>
        );
      })}

      <h3 className="t-title jr-log-title">Log</h3>
      {shownWeeks.map((w) => (
        <section key={w.week} aria-labelledby={`jr-w-${w.week}`}>
          <h4 id={`jr-w-${w.week}`} className="t-foot jr-week list-title">
            {w.heading}
          </h4>
          <ul className="list">
            {w.entries.map(({ checkin: c, later }) => (
              <SwipeRow
                key={c.id}
                as="li"
                className="row"
                actions={[{ label: "Delete", destructive: true, onSelect: () => remove(c) }]}
              >
                <ContextMenu
                  className="jr-log"
                  label={shortLabel(`${nameOf(c)}, ${formatDate(c.date)}`)}
                  items={[
                    c.note && { label: "Copy note", icon: "copy", onSelect: () => copyNote(c) },
                    { label: "Delete check-in", icon: "trash", destructive: true, onSelect: () => remove(c) },
                  ]}
                >
                  <div className="jr-log-head">
                    <span className="t-foot">{formatDate(c.date)}</span>
                    <span className="t-head">{nameOf(c)}</span>
                    {later && <span className="jr-later">Added later</span>}
                  </div>
                  <p className="t-sub">
                    {PRACTISED_LABEL[c.practised] ?? c.practised} · Score {c.score}
                  </p>
                  {c.note && <p className="t-body jr-note">{c.note}</p>}
                  {practiceOf(c) && <p className="t-foot">{practiceOf(c)}</p>}
                </ContextMenu>
              </SwipeRow>
            ))}
          </ul>
        </section>
      ))}
      {weeks.length > MAX_WEEKS && (
        <div className="jr-more-wrap">
          <button
            type="button"
            className="btn-text jr-more"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show fewer weeks" : "Show earlier weeks"}
          </button>
        </div>
      )}
    </div>
  );
}
