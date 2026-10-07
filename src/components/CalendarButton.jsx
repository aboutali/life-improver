import { useId, useState } from "react";
import { downloadIcs } from "../lib/ics.js";
import { nextOccurrence, firstOneLabel } from "../lib/rhythm.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// A button that opens a small day-and-time picker, then downloads a weekly
// .ics event. `buildIcs(start: Date)` returns the calendar text. The panel says
// when the first one falls. `minDaysAhead` keeps it at least that many days
// after today.
export default function CalendarButton({
  label,
  buildIcs,
  filename,
  defaultDay = 0,
  defaultTime = "18:00",
  minDaysAhead = 0,
  triggerClassName = "btn btn-tap",
  defaultOpen = false,
  showTrigger = true,
}) {
  const uid = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [day, setDay] = useState(defaultDay);
  const [time, setTime] = useState(defaultTime);
  const [done, setDone] = useState(false);

  const add = () => {
    const start = nextOccurrence(day, time || defaultTime, { minDaysAhead });
    downloadIcs(filename, buildIcs(start));
    setDone(true);
  };

  return (
    <div className="cal">
      {showTrigger && (
        <button
          type="button"
          className={triggerClassName}
          aria-expanded={open}
          aria-controls={`${uid}-panel`}
          onClick={() => setOpen((o) => !o)}
        >
          {label}
        </button>
      )}
      {open && (
        <div id={`${uid}-panel`} className="cal-panel" role="group" aria-label={label}>
          <div className="cal-fields">
            <label className="cal-field" htmlFor={`${uid}-day`}>
              <span>Day</span>
              <select
                id={`${uid}-day`}
                className="input"
                value={day}
                onChange={(e) => { setDay(Number(e.target.value)); setDone(false); }}
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
                onChange={(e) => { setTime(e.target.value); setDone(false); }}
              />
            </label>
          </div>
          <p className="cal-first">
            {firstOneLabel({ day, time: time || defaultTime, minDaysAhead })}
          </p>
          <button type="button" className="btn btn-tap" onClick={add}>
            Download calendar file
          </button>
          <p className="cal-note" role="status">
            {done ? "Downloaded. Open the file to save it to your calendar. It repeats weekly." : ""}
          </p>
        </div>
      )}
    </div>
  );
}
