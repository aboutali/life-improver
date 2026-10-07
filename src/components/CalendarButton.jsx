import { useId, useState } from "react";
import { downloadIcs } from "../lib/ics.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The next moment that falls on `day` (0 = Sunday) at "HH:MM" local time,
// strictly after `now`.
function nextOccurrence(day, time, now = new Date()) {
  const [h, m] = time.split(":").map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
  start.setDate(start.getDate() + ((day - now.getDay() + 7) % 7));
  if (start.getTime() <= now.getTime()) start.setDate(start.getDate() + 7);
  return start;
}

// A button that opens a small day-and-time picker, then downloads a weekly
// .ics event. `buildIcs(start: Date)` returns the calendar text.
export default function CalendarButton({
  label,
  buildIcs,
  filename,
  defaultDay = 0,
  defaultTime = "18:00",
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(defaultDay);
  const [time, setTime] = useState(defaultTime);
  const [done, setDone] = useState(false);

  const add = () => {
    const start = nextOccurrence(day, time || defaultTime);
    downloadIcs(filename, buildIcs(start));
    setDone(true);
  };

  return (
    <div className="cal">
      <button
        type="button"
        className="btn btn-tap"
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && (
        <div id={`${uid}-panel`} className="cal-panel">
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
