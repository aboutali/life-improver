import { useCallback, useEffect, useRef } from "react";
import Header from "./components/Header.jsx";
import TabBar from "./components/TabBar.jsx";
import Overview from "./components/Overview.jsx";
import SelfAssessment from "./components/SelfAssessment.jsx";
import Ideas from "./components/Ideas.jsx";
import Sources from "./components/Sources.jsx";
import Today from "./components/Today.jsx";
import Onboarding from "./components/Onboarding.jsx";
import CheckIn from "./components/CheckIn.jsx";
import Journey from "./components/Journey.jsx";
import Settings from "./components/Settings.jsx";
import Notices from "./components/Notices.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { useScores } from "./hooks/useScores.js";
import { useQuickScores } from "./hooks/useQuickScores.js";
import { useFocus } from "./hooks/useFocus.js";
import { useCheckins } from "./hooks/useCheckins.js";
import { useRoute, href } from "./lib/router.js";
import { buildExport } from "./lib/storage.js";
import { saveJson } from "./lib/download.js";
import { toLocalDate } from "./lib/dates.js";

// Reading and form screens sit in a narrower column.
const NARROW = new Set(["/", "/welcome", "/welcome/rate", "/welcome/focus", "/checkin", "/journey", "/settings"]);

export default function App() {
  const { path, query, focusKey, navigate: go } = useRoute();
  const mainRef = useRef(null);

  // Leaving Settings for the welcome screen means a reset: replace the entry
  // so Back does not return to a screen of data that is gone.
  const navigate = useCallback(
    (next, opts) =>
      go(next, opts ?? (path === "/settings" && next === "/welcome" ? { replace: true } : undefined)),
    [go, path]
  );
  const scores = useScores();
  const quick = useQuickScores();
  const focus = useFocus();
  const checkins = useCheckins();

  const hasQuick = Object.keys(quick.quick || {}).length > 0;
  const isNewcomer = !hasQuick && scores.scoredCount === 0;
  const hasData = !isNewcomer || Boolean(focus.focus) || checkins.checkins.length > 0;

  useEffect(() => {
    if (path === "/" && isNewcomer) go("/welcome", { replace: true, quiet: true });
  }, [path, isNewcomer, go]);

  // After a route change, move focus to the new screen's heading, or to
  // <main> when there is none. Waits a frame so a redirect or an error screen
  // has rendered first. Not on first load.
  useEffect(() => {
    if (focusKey === 0) return undefined;
    const frame = requestAnimationFrame(() => {
      const target = mainRef.current?.querySelector("h2") ?? mainRef.current;
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusKey]);

  const shared = { scores, quick, focus, checkins, navigate };

  // The in-memory state, so a copy can be saved even when storage is blocked.
  const downloadCopy = () =>
    saveJson(
      `life-improver-${toLocalDate()}.json`,
      buildExport({
        scores: scores.scores,
        quick: quick.quick,
        focus: focus.focus,
        checkins: checkins.checkins,
      })
    );

  let screen;
  switch (path) {
    case "/welcome":
    case "/welcome/rate":
    case "/welcome/focus":
      screen = <Onboarding {...shared} path={path} />;
      break;
    case "/checkin":
      screen = <CheckIn {...shared} path={path} />;
      break;
    case "/journey":
      screen = <Journey {...shared} path={path} />;
      break;
    case "/assess":
      screen = <SelfAssessment scores={scores} focus={focus} checkins={checkins} navigate={navigate} />;
      break;
    case "/practices":
      screen = <Ideas focus={focus} checkins={checkins} navigate={navigate} query={query} />;
      break;
    case "/framework":
      screen = <Overview />;
      break;
    case "/sources":
      screen = <Sources />;
      break;
    case "/settings":
      screen = <Settings {...shared} path={path} />;
      break;
    default:
      screen = <Today {...shared} />;
  }

  const maxWidth = NARROW.has(path) ? 720 : 960;
  const footLink = { color: "#2B6CB0", display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 12px" };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header path={path} />
      <TabBar path={path} />

      <main id="main" ref={mainRef} tabIndex={-1} style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 64px", outline: "none" }}>
        <div className="app-screen" style={{ maxWidth }}>
          <Notices path={path} isNewcomer={isNewcomer} hasData={hasData} onDownload={downloadCopy} />
          <ErrorBoundary resetKey={path}>{screen}</ErrorBoundary>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #D5D5D5", background: "#fff", padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#AAA" }}>
          Built on the work of Aristotle, Frankl, Gottman, Maslow, Csikszentmihalyi, and the traditions that came before.
        </p>
        <nav aria-label="More" className="app-foot" style={{ fontSize: 12, marginTop: 8 }}>
          <a href={href("/framework")} style={footLink}>Framework</a>
          <a href={href("/sources")} style={footLink}>Sources</a>
          <a href={href("/settings")} style={footLink}>Settings &amp; privacy</a>
        </nav>
      </footer>
    </div>
  );
}
