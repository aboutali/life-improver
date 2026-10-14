// Small line icons for the Today screen. All are decorative (aria-hidden).
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

export const Chevron = () => (
  <svg {...base} width={20} height={20} className="chev">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const SwapIcon = () => (
  <svg {...base} className="row-ic">
    <path d="M17 3l4 4-4 4" />
    <path d="M3 11V9a2 2 0 0 1 2-2h16" />
    <path d="M7 21l-4-4 4-4" />
    <path d="M21 13v2a2 2 0 0 1-2 2H3" />
  </svg>
);

export const CalendarIcon = () => (
  <svg {...base} className="row-ic">
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

export const CompassIcon = () => (
  <svg {...base} className="row-ic">
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </svg>
);
