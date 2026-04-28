import { FRAMEWORK } from "../data/framework.js";

// Shared sidebar used by the assessment and ideas tabs. `accessory(d, i)`
// returns the small element shown on the right of each row (e.g. a domain
// average score, or a count of practices) — pass null to omit.
export default function DomainSidebar({ activeIndex, onSelect, accessory }) {
  return (
    <div className="sidebar" style={{ width: 220, flexShrink: 0 }}>
      {FRAMEWORK.map((d, i) => (
        <button
          key={d.id}
          className={`db ${activeIndex === i ? "a" : ""}`}
          onClick={() => onSelect(i)}
        >
          <span style={{ flex: 1, fontWeight: activeIndex === i ? 600 : 400 }}>
            {d.domain}
          </span>
          {accessory && accessory(d, i)}
        </button>
      ))}
    </div>
  );
}
