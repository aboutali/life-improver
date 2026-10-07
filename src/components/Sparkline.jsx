import { parseLocalDate } from "../lib/dates.js";

const PAD = 5;

function shortDate(value) {
  try {
    return parseLocalDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return String(value);
  }
}

// Tiny inline SVG line of scores over time. Scale is fixed at 1..10 so lines
// from different subs read alike. `series` is [{ date, score }], oldest first.
export default function Sparkline({ series = [], width = 120, height = 36, label }) {
  if (!series.length) return null;

  const first = series[0];
  const last = series[series.length - 1];
  const summary =
    series.length === 1
      ? `Score ${first.score} out of 10 on ${shortDate(first.date)}.`
      : `Score moved from ${first.score} on ${shortDate(first.date)} to ${last.score} on ${shortDate(last.date)}, out of 10.`;
  const name = label ? `${label}: ${summary}` : summary;

  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;
  const x = (i) => (series.length === 1 ? width / 2 : PAD + (i / (series.length - 1)) * innerW);
  const y = (score) => PAD + ((10 - Math.min(10, Math.max(1, score))) / 9) * innerH;
  const points = series.map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");

  return (
    <svg
      role="img"
      aria-label={name}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ display: "block", maxWidth: "100%", flexShrink: 0 }}
    >
      {series.length > 1 && (
        <polyline points={points} fill="none" stroke="#2B6CB0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {series.length > 1 && <circle cx={x(0)} cy={y(first.score)} r="2" fill="#fff" stroke="#2B6CB0" strokeWidth="1.5" />}
      <circle cx={x(series.length - 1)} cy={y(last.score)} r="3.5" fill="#2B6CB0" />
    </svg>
  );
}
