import { useEffect, useRef, useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { useToday } from "../hooks/useToday.js";
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
  const today = useToday();
  const triggerRef = useRef(null);
  const wasPicking = useRef(false);
  const quickScores = quick.quick || {};

  const current = focus.focus;
  const currentDomain = current && FRAMEWORK.find((d) => d.id === current.domainId);
  const currentSub = currentDomain && currentDomain.subs[current.subIndex];
  const hasFocus = Boolean(currentSub);

  const suggestion = hasFocus
    ? null
    : suggestFocus({ scores: scores.scores, quick: quickScores });

  // When the picker closes, focus returns to the button that opened it.
  useEffect(() => {
    if (wasPicking.current && !picking && triggerRef.current) triggerRef.current.focus();
    wasPicking.current = picking;
  }, [picking]);

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
          picking={picking}
          onChoose={() => setPicking(true)}
          triggerRef={triggerRef}
          picker={
            <FocusPicker
              scores={scores}
              quickScores={quickScores}
              current={current}
              currentLabel="Current"
              closeLabel="Keep this focus"
              onPick={plant}
              onClose={() => setPicking(false)}
            />
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
          triggerRef={triggerRef}
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

      {hasFocus && <CheckinCard checkins={checkins.checkins} today={today} navigate={navigate} />}

      <Garden scores={scores} quickScores={quickScores} focusDomainId={hasFocus ? current.domainId : null} />
      <p className="today-refine">
        <a href="#/assess">Refine with the full assessment</a>
      </p>
    </div>
  );
}

function FocusCard({ focus, domain, sub, reason, onSwap, picking, onChoose, triggerRef, picker }) {
  const text = sub.ideas[focus.practiceIndex] ?? sub.ideas[0];
  return (
    <section className="cd fc" aria-labelledby="fc-title">
      <p className="fc-eyebrow">Your practice this week &middot; {domain.domain}</p>
      <h3 id="fc-title" className="sf fc-title">{sub.name}</h3>
      <p className="sf fc-practice">{text}</p>
      <p className="today-muted">{reason}</p>
      <div className="fc-actions">
        <button type="button" className="btn-text" onClick={onSwap}>
          Swap practice
        </button>
        <CalendarButton
          label="Add to calendar"
          triggerClassName="btn-text"
          filename="life-improver-practice.ics"
          buildIcs={(start) =>
            practiceEvent({ start, practiceText: text, subName: sub.name, appUrl: appUrl() })
          }
        />
        <button
          type="button"
          className="btn-text"
          ref={triggerRef}
          aria-expanded={picking}
          onClick={onChoose}
        >
          Choose another focus
        </button>
      </div>
      {picking && picker}
    </section>
  );
}

function SuggestionCard({ suggestion, today, checkins, picking, onPlant, onChoose, triggerRef, picker }) {
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
          <button type="button" className="btn btn-tap" ref={triggerRef} onClick={onChoose}>
            Choose another
          </button>
        )}
      </div>
      {picking && picker}
    </section>
  );
}

function CheckinCard({ checkins, today, navigate }) {
  const [reminding, setReminding] = useState(false);
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
      <div>
        <button
          type="button"
          className="btn-text btn-quiet"
          aria-expanded={reminding}
          aria-controls="remind-weekly"
          onClick={() => setReminding((r) => !r)}
        >
          Remind me weekly
        </button>
      </div>
      {reminding && (
        <div id="remind-weekly">
          <CalendarButton
            label="Add a weekly check-in to my calendar"
            filename="life-improver-checkin.ics"
            buildIcs={(start) => checkinEvent({ start, appUrl: appUrl() })}
            defaultOpen
            showTrigger={false}
          />
        </div>
      )}
    </section>
  );
}
