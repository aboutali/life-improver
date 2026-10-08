import { useEffect, useRef, useState } from "react";
import { parseLocalDate } from "../lib/dates.js";

const PAD = 6;

function shortDate(value) {
  try {
    return parseLocalDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return String(value);
  }
}

// Tiny inline SVG line of scores over time. Scale is fixed at 1..10 so lines
// from different subs read alike. `series` is [{ date, score }], oldest first.
// The line fills the width of its container: the box is measured and the SVG
// drawn at that pixel width, so dots stay round and strokes stay crisp.
// `width` is only the first guess before measuring (and the size in jsdom).
export default function Sparkline({ series = [], width: initialWidth = 120, height = 40, label }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [series.length]);

  if (!series.length) return null;

  // One point is not a line yet: say so instead of drawing a lone dot.
  if (series.length === 1) {
    return (
      <p className="t-foot spark spark-start" style={{ minHeight: height }}>
        Your line starts here.
      </p>
    );
  }

  const first = series[0];
  const last = series[series.length - 1];
  const summary = `Score moved from ${first.score} on ${shortDate(first.date)} to ${last.score} on ${shortDate(last.date)}, out of 10.`;
  const name = label ? `${label}: ${summary}` : summary;

  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;
  const x = (i) => PAD + (i / (series.length - 1)) * innerW;
  const y = (score) => PAD + ((10 - Math.min(10, Math.max(1, score))) / 9) * innerH;
  const points = series.map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");

  return (
    <div ref={boxRef} className="spark" style={{ height }}>
      <svg
        role="img"
        aria-label={name}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block" }}
      >
        <polygon className="spark-area" points={`${x(0).toFixed(1)},${height - PAD} ${points} ${x(series.length - 1).toFixed(1)},${height - PAD}`} />
        <polyline className="spark-line" points={points} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle className="spark-dot-first" cx={x(0)} cy={y(first.score)} r="3" strokeWidth="2" />
        <circle className="spark-dot-last" cx={x(series.length - 1)} cy={y(last.score)} r="4.5" />
      </svg>
    </div>
  );
}
