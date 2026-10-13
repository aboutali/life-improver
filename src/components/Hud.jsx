import { useHud } from "../lib/hud.js";

const ICONS = {
  check: <path d="M6 12.5l4 4 8-9" />,
  info: <path d="M12 7.5v.01M12 11v6" />,
};

// The HUD: a translucent rounded square in the middle of the screen with an
// icon and a few words. It fades in and out by itself (see HUD_MS). The
// wrapper is a polite live region and stays mounted, so screen readers hear
// each new message. Mounted by showHud.jsx; screens never render it.
export default function HudHost() {
  const hud = useHud();
  return (
    <div className="hud-host" role="status" aria-live="polite">
      {hud && (
        <div key={hud.id} className="hud">
          <svg
            className="hud-ic"
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            {ICONS[hud.icon] || ICONS.check}
          </svg>
          <span className="hud-text">{hud.text}</span>
        </div>
      )}
    </div>
  );
}
