import { useId, useState } from "react";
import { downloadIcs } from "../lib/ics.js";
import { nextOccurrence, firstOneLabel } from "../lib/rhythm.js";
import { Chevron } from "./TodayIcons.jsx";
import Sheet from "./Sheet.jsx";
import { showHud } from "./showHud.jsx";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// A button that opens a bottom sheet with a day-and-time picker, then downloads
// a weekly .ics event. `buildIcs(start: Date)` returns the calendar text. The
// sheet says when the first one falls. `minDaysAhead` keeps it at least that
// many days after today.
//
// The sheet is titled with `label`. Open it from the built-in button, or drive
// it yourself: pass `open` and `onClose` (and showTrigger={false}).
export default function CalendarButton({
  label,
  buildIcs,
  filename,
  defaultDay = 0,
  defaultTime = "18:00",
  minDaysAhead = 0,
  triggerClassName = "btn",
  icon = null,
  chevron = false,
  defaultOpen = false,
  showTrigger = true,
  open: openProp,
  onClose,
}) {
  const uid = useId();
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [day, setDay] = useState(defaultDay);
  const [time, setTime] = useState(defaultTime);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : innerOpen;
  const close = () => {
    if (controlled) {
      if (onClose) onClose();
    } else {
      setInnerOpen(false);
    }
  };

  const add = () => {
    const start = nextOccurrence(day, time || defaultTime, { minDaysAhead });
    downloadIcs(filename, buildIcs(start));
    showHud("Added to calendar");
    close();
  };

  return (
    <div className="cal">
      {showTrigger && (
        <button
          type="button"
          className={triggerClassName}
          aria-haspopup="dialog"
          onClick={() => setInnerOpen(true)}
        >
          {icon}
          <span>{label}</span>
          {chevron && <Chevron />}
        </button>
      )}
      <Sheet open={open} onClose={close} title={label}>
        <div className="cal-panel">
          <div className="cal-fields">
            <label className="cal-field" htmlFor={`${uid}-day`}>
              <span>Day</span>
              <select
                id={`${uid}-day`}
                className="input"
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              >
                {DAYS.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </select>
            </label>
            <label className="cal-field" htmlFor={`${uid}-time`}>
              <span>Time</span>
              <input
                id={`${uid}-time`}
                className="input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          </div>
          <p className="cal-first">
            {firstOneLabel({ day, time: time || defaultTime, minDaysAhead })}
          </p>
          <p className="cal-note">It repeats weekly. Open the file to save it to your calendar.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={add}>
            Download calendar file
          </button>
        </div>
      </Sheet>
    </div>
  );
}
