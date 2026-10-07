import { useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { toLocalDate } from "../lib/dates.js";
import { suggestFocus, suggestPractice, nextPractice } from "../lib/recommend.js";
import { hasCheckinThisWeek } from "../lib/trends.js";
import { checkinEvent, practiceEvent } from "../lib/ics.js";
import FocusPicker from "./FocusPicker.jsx";
import Garden from "./Garden.jsx";
import CalendarButton from "./CalendarButton.jsx";

const appUrl = () => window.location.origin + window.location.pathname;

// One line saying why this sub, from what the person has rated.
function reasonFor(focus, scores, quickScores) {
  const full = scores.get(focus.domainId, focus.subIndex);
  if (full) return `You rated this ${full}/10.`;
  const domain = FRAMEWORK.find((d) => d.id === focus.domainId);
  const q = quickScores[focus.domainId];
  if (domain && typeof q === "number") return `You rated ${domain.domain} ${q}/10.`;
  return "A place you chose to begin.";
}

export default function Today({ scores, quick, focus, checkins, navigate }) {
  const [picking, setPicking] = useState(false);
  const today = toLocalDate();
  const quickScores = quick.quick || {};

  const current = focus.focus;
  const currentDomain = current && FRAMEWORK.find((d) => d.id === current.domainId);
  const currentSub = currentDomain && currentDomain.subs[current.subIndex];
  const hasFocus = Boolean(currentSub);

  const suggestion = hasFocus
    ? null
    : suggestFocus({ scores: scores.scores, quick: quickScores });

  const plant = (domainId, subIndex) => {
    const { practiceIndex } = suggestPractice({
      framework: FRAMEWORK,
      domainId,
      subIndex,
      checkins: checkins.checkins,
      skipped: [],
      today,
    });
    focus.setFocus({ domainId, subIndex, practiceIndex, startedAt: today, skipped: [] });
    setPicking(false);
  };

  return (
    <div className="today">
      <h2 className="sf today-greet">This week, tend one thing.</h2>

      {hasFocus ? (
        <FocusCard
          focus={current}
          domain={currentDomain}
          sub={currentSub}
          reason={reasonFor(current, scores, quickScores)}
          onSwap={() =>
            focus.setFocus(nextPractice(current, FRAMEWORK, checkins.checkins, today))
          }
        />
      ) : suggestion ? (
        <SuggestionCard
          suggestion={suggestion}
          today={today}
          checkins={checkins.checkins}
          picking={picking}
          onPlant={() => plant(suggestion.domainId, suggestion.subIndex)}
          onChoose={() => setPicking(true)}
          picker={
            <FocusPicker
              scores={scores}
              quickScores={quickScores}
              current={suggestion}
              onPick={plant}
              onClose={() => setPicking(false)}
            />
          }
        />
      ) : (
        <section className="cd">
          <p className="sf" style={{ fontSize: "var(--fs-lead)", color: "#1A1A1A", marginBottom: 12 }}>
            Nothing is rated yet.
          </p>
          <button type="button" className="btn btn-primary btn-tap" onClick={() => navigate("/welcome")}>
            Begin with a short welcome
          </button>
        </section>
      )}

      {hasFocus && (
        <>
          <CheckinCard checkins={checkins.checkins} today={today} navigate={navigate} />
          <section className="cd" aria-labelledby="cal-checkin-title">
            <h3 id="cal-checkin-title" className="sf today-h3">A weekly pause</h3>
            <p className="today-muted">Set a gentle reminder to look back on the week.</p>
            <CalendarButton
              label="Add a weekly check-in to my calendar"
              filename="life-improver-checkin.ics"
              buildIcs={(start) => checkinEvent({ start, appUrl: appUrl() })}
            />
          </section>
        </>
      )}

      <Garden scores={scores} quickScores={quickScores} />
      <p className="today-refine">
        <a href="#/assess">Refine with the full assessment</a>
      </p>
    </div>
  );
}

function FocusCard({ focus, domain, sub, reason, onSwap }) {
  const text = sub.ideas[focus.practiceIndex] ?? sub.ideas[0];
  return (
    <section className="cd fc" aria-labelledby="fc-title">
      <p className="fc-eyebrow">{domain.domain}</p>
      <h3 id="fc-title" className="sf fc-title">{sub.name}</h3>
      <p className="sf fc-practice">{text}</p>
      <p className="today-muted">{reason}</p>
      <div className="fc-actions">
        <button type="button" className="btn btn-tap" onClick={onSwap}>
          Swap practice
        </button>
        <CalendarButton
          label="Add practice to calendar"
          filename="life-improver-practice.ics"
          buildIcs={(start) =>
            practiceEvent({ start, practiceText: text, subName: sub.name, appUrl: appUrl() })
          }
        />
      </div>
    </section>
  );
}

function SuggestionCard({ suggestion, today, checkins, picking, onPlant, onChoose, picker }) {
  const domain = FRAMEWORK.find((d) => d.id === suggestion.domainId);
  const sub = domain.subs[suggestion.subIndex];
  const { practiceIndex } = suggestPractice({
    framework: FRAMEWORK,
    domainId: suggestion.domainId,
    subIndex: suggestion.subIndex,
    checkins,
    skipped: [],
    today,
  });
  return (
    <section className="cd fc" aria-labelledby="fc-title">
      <p className="fc-eyebrow">{domain.domain}</p>
      <h3 id="fc-title" className="sf fc-title">{sub.name}</h3>
      <p className="sf fc-practice">{sub.ideas[practiceIndex]}</p>
      <p className="today-muted">{suggestion.reason}</p>
      <div className="fc-actions">
        <button type="button" className="btn btn-primary btn-tap" onClick={onPlant}>
          Plant this seed
        </button>
        {!picking && (
          <button type="button" className="btn btn-tap" onClick={onChoose}>
            Choose another
          </button>
        )}
      </div>
      {picking && picker}
    </section>
  );
}

function CheckinCard({ checkins, today, navigate }) {
  const done = hasCheckinThisWeek(checkins, today);
  const last = checkins[checkins.length - 1];
  return (
    <section className="cd" aria-labelledby="checkin-title">
      <h3 id="checkin-title" className="sf today-h3">
        {done ? "Checked in this week" : "Look back on the week"}
      </h3>
      {done ? (
        <p className="today-muted">
          {last ? `You rated it ${last.score}/10. ` : ""}Rest. The next check-in will wait for you.
        </p>
      ) : (
        <>
          <p className="today-muted">Three questions. About a minute.</p>
          <button type="button" className="btn btn-primary btn-tap" onClick={() => navigate("/checkin")}>
            Check in
          </button>
        </>
      )}
    </section>
  );
}
