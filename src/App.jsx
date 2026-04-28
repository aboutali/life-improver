import { useState } from "react";
import Header from "./components/Header.jsx";
import TabBar from "./components/TabBar.jsx";
import Overview from "./components/Overview.jsx";
import SelfAssessment from "./components/SelfAssessment.jsx";
import Ideas from "./components/Ideas.jsx";
import Sources from "./components/Sources.jsx";
import { useScores } from "./hooks/useScores.js";
import { useCustomPractices } from "./hooks/useCustomPractices.js";

export default function App() {
  const [tab, setTab] = useState(0);
  const scores = useScores();
  const customPractices = useCustomPractices();

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header />
      <TabBar tab={tab} onChange={setTab} />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 64px" }}>
        {tab === 0 && <Overview />}
        {tab === 1 && <SelfAssessment scores={scores} />}
        {tab === 2 && <Ideas customPractices={customPractices} />}
        {tab === 3 && <Sources />}
      </main>

      <footer style={{ borderTop: "1px solid #D5D5D5", background: "#fff", padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#AAA" }}>
          Rooted in Aristotle · Frankl · Gottman · Maslow · Csikszentmihalyi · and the world's contemplative traditions
        </p>
      </footer>
    </div>
  );
}
