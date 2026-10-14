// One calm shape for every empty state: a line icon, a short title, one
// sentence and one action, centred in a card. Icons are decorative.
const base = {
  width: 40,
  height: 40,
  viewBox: "0 0 40 40",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

const ICONS = {
  // A rising line: the Journey before its first mark.
  journey: (
    <svg {...base}>
      <path d="M5 33h30" />
      <path d="M7 27l8-8 6 5 12-14" />
      <path d="M27 10h6v6" />
    </svg>
  ),
  // A calendar with a check: the weekly look back.
  checkin: (
    <svg {...base}>
      <rect x="6" y="8" width="28" height="26" rx="6" />
      <path d="M6 16h28M13 5v6M27 5v6" />
      <path d="M14 25l4 4 8-8" />
    </svg>
  ),
  // A sprout: nothing planted yet.
  seed: (
    <svg {...base}>
      <path d="M20 34V20" />
      <path d="M20 23c0-6-4-10-11-10 0 6 4 10 11 10z" />
      <path d="M20 19c0-5 3-8 10-8 0 5-3 8-10 8z" />
      <path d="M13 34h14" />
    </svg>
  ),
  // A soft triangle: something went astray.
  alert: (
    <svg {...base}>
      <path d="M18.3 7.5a2.3 2.3 0 0 1 3.4 0l12.6 21.2a2.4 2.4 0 0 1-1.7 3.8H7.4a2.4 2.4 0 0 1-1.7-3.8z" />
      <path d="M20 16v7" />
      <path d="M20 27.5v.1" />
    </svg>
  ),
};

export function EmptyIcon({ name }) {
  return ICONS[name] ?? null;
}

// `action` is the single button or link. `level` is the heading level of the
// title (h3 under a screen title; h2 when the card is the whole screen).
export default function EmptyState({ icon, title, children, action, level = 3, titleProps, className = "", ...rest }) {
  const Heading = `h${level}`;
  return (
    <section className={`cd empty ${className}`.trim()} {...rest}>
      <span className="empty-ic">
        <EmptyIcon name={icon} />
      </span>
      <Heading className="t-title empty-title" {...titleProps}>
        {title}
      </Heading>
      <p className="t-sub empty-sub">{children}</p>
      {action}
    </section>
  );
}
