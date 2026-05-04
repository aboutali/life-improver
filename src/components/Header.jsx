import { FRAMEWORK, TOTAL_SUBS, TOTAL_IDEAS } from "../data/framework.js";

export default function Header() {
  return (
    <>
      <div className="bl" />
      <div style={{ background: "#fff", borderBottom: "1px solid #D5D5D5" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 32px" }}>
          <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#2B6CB0", fontWeight: 600, marginBottom: 16 }}>
            Life Framework
          </p>
          <h1 className="sf" style={{ fontSize: 30, fontWeight: 300, lineHeight: 1.35, color: "#1A1A1A", marginBottom: 12, maxWidth: 660 }}>
            Your whole life.<br />In one view.
          </h1>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7, maxWidth: 620 }}>
            {FRAMEWORK.length} dimensions. {TOTAL_SUBS} categories. A clearer picture of where you stand — and where to focus next. Built on decades of research in psychology, philosophy, and human flourishing.
          </p>
          <p style={{ fontSize: 13, color: "#AAA", marginTop: 12 }}>
            {FRAMEWORK.length} domains · {TOTAL_SUBS} categories · {TOTAL_IDEAS} practices
          </p>
        </div>
      </div>
    </>
  );
}
