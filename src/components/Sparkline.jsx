import { useEffect, useId, useRef, useState } from "react";
import { parseLocalDate } from "../lib/dates.js";

const PAD = 6;
const GUTTER = 26; // room for the scale labels on the right (detailed)

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
// `detailed` adds the Apple Health extras: scale labels, the latest value in a
// ring and the first and last date. The accessible description stays the same.
// `width` is only the first guess before measuring (and the size in jsdom).
export default function Sparkline({ series = [], width: initialWidth = 120, height = 40, label, detailed = false }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(initialWidth);
  const gradId = `spark-${useId().replace(/:/g, "")}`;

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
      <p className="t-foot spark spark-start" style={{ minHeight: detailed ? 40 : height }}>
        Your line starts here.
      </p>
    );
  }

  const first = series[0];
  const last = series[series.length - 1];
  const summary = `Score moved from ${first.score} on ${shortDate(first.date)} to ${last.score} on ${shortDate(last.date)}, out of 10.`;
  const name = label ? `${label}: ${summary}` : summary;

  // Detailed (Journey): a right gutter for the 1 and 10 scale labels, headroom
  // for the latest value, and the first and last dates under the line.
  const padTop = detailed ? 28 : PAD;
  const plotRight = detailed ? width - GUTTER : width - PAD;
  const innerW = plotRight - PAD;
  const innerH = height - padTop - PAD;
  const x = (i) => PAD + (i / (series.length - 1)) * innerW;
  const y = (score) => padTop + ((10 - Math.min(10, Math.max(1, score))) / 9) * innerH;
  const points = series.map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const lastX = x(series.length - 1);
  const lastY = y(last.score);

  return (
    <div className={detailed ? "spark-wrap" : undefined}>
      <div ref={boxRef} className={`spark${detailed ? " spark-detail" : ""}`} style={{ height }}>
        <svg
          role="img"
          aria-label={name}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          style={{ display: "block" }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.32 }} />
              <stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {detailed && (
            <>
              <line className="spark-grid" x1={PAD} x2={plotRight + 4} y1={y(10)} y2={y(10)} />
              <line className="spark-grid" x1={PAD} x2={plotRight + 4} y1={y(1)} y2={y(1)} />
            </>
          )}
          <polygon
            className="spark-area"
            style={{ fill: `url(#${gradId})` }}
            points={`${x(0).toFixed(1)},${height - PAD} ${points} ${lastX.toFixed(1)},${height - PAD}`}
          />
          <polyline className="spark-line" points={points} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <circle className="spark-dot-first" cx={x(0)} cy={y(first.score)} r="3" strokeWidth="2" />
          {detailed && <circle className="spark-ring" cx={lastX} cy={lastY} r="9" strokeWidth="2" />}
          <circle className="spark-dot-last" cx={lastX} cy={lastY} r="4.5" />
        </svg>
        {detailed && (
          <>
            <span className="spark-scale" style={{ top: y(10) }} aria-hidden="true">10</span>
            <span className="spark-scale" style={{ top: y(1) }} aria-hidden="true">1</span>
            <span
              className="spark-val"
              style={{ left: lastX, top: lastY - 12 }}
              aria-hidden="true"
            >
              {last.score}
            </span>
          </>
        )}
      </div>
      {detailed && (
        <p className="t-foot spark-dates" aria-hidden="true">
          <span>{shortDate(first.date)}</span>
          <span>{shortDate(last.date)}</span>
        </p>
      )}
    </div>
  );
}
