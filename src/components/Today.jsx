import { useEffect, useRef, useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { useToday } from "../hooks/useToday.js";
import { suggestFocus, nextPractice, makeFocus, lowerSubNudge } from "../lib/recommend.js";
import { hasCheckinThisWeek } from "../lib/trends.js";
import {
  checkinOpensOn,
  defaultCheckinSlot,
  defaultPracticeSlot,
  isCheckinOpen,
  lapsedWeeks,
  seasonCount,
  seasonDue,
  weekdayName,
} from "../lib/rhythm.js";
import { checkinEvent, practiceEvent } from "../lib/ics.js";
import FocusPicker from "./FocusPicker.jsx";
import Garden from "./Garden.jsx";
import CalendarButton from "./CalendarButton.jsx";
import { CalendarIcon, Chevron, CompassIcon, SwapIcon } from "./TodayIcons.jsx";

const appUrl = () => window.location.origin + window.location.pathname;

// "Pick up this practice" hides the welcome-back card for the rest of the visit.
const WELCOME_KEY = "life-improver:welcomeback";
const readPickedUp = () => {
  try {
    return sessionStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return false;
  }
};
const writePickedUp = () => {
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {
    // Without session storage the card simply returns on the next visit.
  }
};

// One line saying why this sub, from what the person has rated.
function reasonFor(focus, scores, quickScores) {
  if (focus.origin === "picked" || focus.origin === "practice") return "You chose this place to begin.";
  const full = scores.get(focus.domainId, focus.subIndex);
  if (full) return `You rated this ${full}/10.`;
  const domain = FRAMEWORK.find((d) => d.id === focus.domainId);
  const q = quickScores[focus.domainId];
  if (domain && typeof q === "number") return `You rated ${domain.domain} ${q}/10.`;
  return "A place you chose to begin.";
}

export default function Today({ scores, quick, focus, checkins, navigate }) {
  const [picking, setPicking] = useState(false);
  const [pickedUp, setPickedUp] = useState(readPickedUp);
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

  const plant = (domainId, subIndex, origin) => {
    focus.setFocus(
      makeFocus({ domainId, subIndex, origin, today, checkins: checkins.checkins })
    );
    setPicking(false);
  };

  // Choosing the sub already in focus changes nothing.
  const pickFromList = (domainId, subIndex) => {
    if (hasFocus && current.domainId === domainId && current.subIndex === subIndex) {
      setPicking(false);
      return;
    }
    plant(domainId, subIndex, "picked");
  };

  const dismissWelcome = () => {
    writePickedUp();
    setPickedUp(true);
  };

  const away = hasFocus && !pickedUp ? lapsedWeeks(checkins.checkins, today) : 0;
  const season = hasFocus && seasonDue(current, checkins.checkins);
  const nudge = hasFocus && !season ? lowerSubNudge({ scores: scores.scores, focus: current }) : null;
  const nudgeSub = nudge && FRAMEWORK.find((d) => d.id === nudge.domainId)?.subs[nudge.subIndex];

  return (
    <div className="today">
      <h2 className="t-large today-greet">This week, tend one thing.</h2>

      {away > 0 && (
        <WelcomeBackCard
          weeks={away}
          onPickUp={dismissWelcome}
          onFresh={() => {
            dismissWelcome();
            setPicking(true);
          }}
        />
      )}
      {season && (
        <SeasonCard
          count={seasonCount(current, checkins.checkins)}
          subName={currentSub.name}
          onStay={() => focus.setFocus({ ...current, reviewedAt: today })}
          onChoose={() => setPicking(true)}
        />
      )}
      {nudge && nudgeSub && (
        <NudgeCard
          name={nudgeSub.name}
          score={nudge.score}
          onSwitch={() => plant(nudge.domainId, nudge.subIndex, "picked")}
          onDismiss={() =>
            focus.setFocus({
              ...current,
              dismissedNudge: { key: `${nudge.domainId}-${nudge.subIndex}`, score: nudge.score },
            })
          }
        />
      )}

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
              onPick={pickFromList}
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
          onPlant={() => plant(suggestion.domainId, suggestion.subIndex, "suggested")}
          onChoose={() => setPicking(true)}
          triggerRef={triggerRef}
          picker={
            <FocusPicker
              scores={scores}
              quickScores={quickScores}
              current={suggestion}
              onPick={pickFromList}
              onClose={() => setPicking(false)}
            />
          }
        />
      ) : (
        <section className="cd">
          <p className="t-title today-h3">Nothing is rated yet.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate("/welcome")}>
            Begin with a short welcome
          </button>
        </section>
      )}

      {hasFocus && (
        <CheckinCard focus={current} checkins={checkins.checkins} today={today} navigate={navigate} />
      )}

      <Garden scores={scores} quickScores={quickScores} focusDomainId={hasFocus ? current.domainId : null} />
      <div className="list today-refine">
        <a className="row" href="#/assess">
          <span>Refine with the full assessment</span>
          <Chevron />
        </a>
      </div>
    </div>
  );
}

function FocusCard({ focus, domain, sub, reason, onSwap, picking, onChoose, triggerRef, picker }) {
  const text = sub.ideas[focus.practiceIndex] ?? sub.ideas[0];
  const practiceSlot = defaultPracticeSlot();
  return (
    <section className="cd fc" aria-labelledby="fc-title">
      <p className="t-eyebrow fc-eyebrow">Your practice this week &middot; {domain.domain}</p>
      <h3 id="fc-title" className="t-title fc-title">{sub.name}</h3>
      <p className="sf fc-practice">{text}</p>
      <p className="t-foot fc-reason">{reason}</p>
      <div className="list fc-list">
        <button type="button" className="row" onClick={onSwap}>
          <SwapIcon />
          <span>Swap practice</span>
        </button>
        <CalendarButton
          label="Add to calendar"
          triggerClassName="row"
          icon={<CalendarIcon />}
          chevron
          filename="life-improver-practice.ics"
          defaultDay={practiceSlot.day}
          defaultTime={practiceSlot.time}
          minDaysAhead={practiceSlot.minDaysAhead}
          buildIcs={(start) =>
            practiceEvent({ start, practiceText: text, subName: sub.name, appUrl: appUrl() })
          }
        />
        <button
          type="button"
          className="row"
          ref={triggerRef}
          aria-expanded={picking}
          onClick={onChoose}
        >
          <CompassIcon />
          <span>Choose another focus</span>
          <Chevron />
        </button>
      </div>
      {picking && picker}
    </section>
  );
}

function SuggestionCard({ suggestion, today, checkins, picking, onPlant, onChoose, triggerRef, picker }) {
  const domain = FRAMEWORK.find((d) => d.id === suggestion.domainId);
  const sub = domain.subs[suggestion.subIndex];
  const { practiceIndex } = makeFocus({
    domainId: suggestion.domainId,
    subIndex: suggestion.subIndex,
    today,
    checkins,
  });
  return (
    <section className="cd fc" aria-labelledby="fc-title">
      <p className="t-eyebrow fc-eyebrow">{domain.domain}</p>
      <h3 id="fc-title" className="t-title fc-title">{sub.name}</h3>
      <p className="sf fc-practice">{sub.ideas[practiceIndex]}</p>
      <p className="t-foot fc-reason">{suggestion.reason}</p>
      <div className="fc-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onPlant}>
          Plant this seed
        </button>
        {!picking && (
          <button type="button" className="btn btn-block" ref={triggerRef} onClick={onChoose}>
            Choose another
          </button>
        )}
      </div>
      {picking && picker}
    </section>
  );
}

function WelcomeBackCard({ weeks, onPickUp, onFresh }) {
  return (
    <section className="cd wb" aria-labelledby="wb-line">
      <p id="wb-line" className="t-title wb-line">Welcome back. It has been {weeks} weeks.</p>
      <p className="t-sub wb-sub">Nothing is lost. Begin again wherever you are.</p>
      <div className="fc-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onPickUp}>
          Pick up this practice
        </button>
        <button type="button" className="btn btn-block" onClick={onFresh}>
          Start fresh
        </button>
      </div>
    </section>
  );
}

function SeasonCard({ count, subName, onStay, onChoose }) {
  const lead = count === 4 ? "Four" : String(count);
  return (
    <section className="cd wb" aria-labelledby="season-line">
      <p id="season-line" className="t-title wb-line">
        {lead} weeks with {subName}. Stay for another season, or choose a new focus?
      </p>
      <div className="fc-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onStay}>
          Stay with {subName}
        </button>
        <button type="button" className="btn btn-block" onClick={onChoose}>
          Choose a new focus
        </button>
      </div>
    </section>
  );
}

function NudgeCard({ name, score, onSwitch, onDismiss }) {
  return (
    <section className="cd wb nudge" aria-labelledby="nudge-line">
      <p id="nudge-line" className="t-title wb-line">
        {name} is now your lowest ({score}/10). Switch your focus?
      </p>
      <div className="fc-actions">
        <button type="button" className="btn btn-block" onClick={onSwitch}>
          Switch
        </button>
        <button type="button" className="btn-text btn-block" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </section>
  );
}

function CheckinCard({ focus, checkins, today, navigate }) {
  const [reminding, setReminding] = useState(false);
  const done = hasCheckinThisWeek(checkins, today);
  const open = isCheckinOpen(focus, today);
  const last = checkins[checkins.length - 1];
  const slot = defaultCheckinSlot();
  return (
    <section className="cd" aria-labelledby="checkin-title">
      <h3 id="checkin-title" className="t-title today-h3">
        {done ? "Checked in this week" : "Look back on the week"}
      </h3>
      {done ? (
        <p className="t-sub">
          {last ? `You rated it ${last.score}/10. ` : ""}Rest. The next check-in will wait for you.
        </p>
      ) : open ? (
        <>
          <p className="t-sub">Three questions. About a minute.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate("/checkin")}>
            Check in
          </button>
        </>
      ) : (
        <>
          <p className="t-sub">Your first check-in opens {weekdayName(checkinOpensOn(focus))}.</p>
          <a
            href="#/checkin"
            className="btn btn-block"
            onClick={(e) => {
              e.preventDefault();
              navigate("/checkin");
            }}
          >
            Check in early
          </a>
        </>
      )}
      <div className="remind">
        <button
          type="button"
          className="btn-text"
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
            defaultDay={slot.day}
            defaultTime={slot.time}
            minDaysAhead={slot.minDaysAhead}
            defaultOpen
            showTrigger={false}
          />
        </div>
      )}
    </section>
  );
}
