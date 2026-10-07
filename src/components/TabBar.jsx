import { useEffect, useRef } from "react";
import { ROUTES, href } from "../lib/router.js";

const TABS = ROUTES.filter((r) => r.tab);

export default function TabBar({ path }) {
  const activeRef = useRef(null);

  useEffect(() => {
    const el = activeRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [path]);

  return (
    <nav aria-label="Main" style={{ background: "#fff", borderBottom: "1px solid #D5D5D5", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
        <div className="tabbar" style={{ borderBottom: "none" }}>
          {TABS.map((t) => {
            const active = t.path === path;
            return (
              <a
                key={t.path}
                ref={active ? activeRef : null}
                href={href(t.path)}
                className={`ti ${active ? "a" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
