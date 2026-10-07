import { useEffect } from "react";
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
import { useScores } from "./hooks/useScores.js";
import { useQuickScores } from "./hooks/useQuickScores.js";
import { useFocus } from "./hooks/useFocus.js";
import { useCheckins } from "./hooks/useCheckins.js";
import { useRoute, href } from "./lib/router.js";

export default function App() {
  const { path, navigate } = useRoute();
  const scores = useScores();
  const quick = useQuickScores();
  const focus = useFocus();
  const checkins = useCheckins();

  const hasQuick = Object.keys(quick.quick || {}).length > 0;
  const isNewcomer = !hasQuick && scores.scoredCount === 0;

  useEffect(() => {
    if (path === "/" && isNewcomer) navigate("/welcome");
  }, [path, isNewcomer, navigate]);

  const shared = { scores, quick, focus, checkins, navigate };

  let screen;
  switch (path) {
    case "/welcome":
      screen = <Onboarding {...shared} />;
      break;
    case "/checkin":
      screen = <CheckIn {...shared} />;
      break;
    case "/journey":
      screen = <Journey {...shared} />;
      break;
    case "/assess":
      screen = <SelfAssessment scores={scores} />;
      break;
    case "/practices":
      screen = <Ideas />;
      break;
    case "/framework":
      screen = <Overview />;
      break;
    case "/sources":
      screen = <Sources />;
      break;
    case "/settings":
      screen = <Settings {...shared} />;
      break;
    default:
      screen = <Today {...shared} />;
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header path={path} />
      <TabBar path={path} />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 64px" }}>
        {screen}
      </main>

      <footer style={{ borderTop: "1px solid #D5D5D5", background: "#fff", padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#AAA" }}>
          Built on the work of Aristotle, Frankl, Gottman, Maslow, Csikszentmihalyi, and the traditions that came before.
        </p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          <a href={href("/settings")} style={{ color: "#2B6CB0", display: "inline-block", padding: "12px 8px" }}>
            Settings &amp; privacy
          </a>
        </p>
      </footer>
    </div>
  );
}
