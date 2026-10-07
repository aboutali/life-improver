import { Component } from "react";
import { href } from "../lib/router.js";

// Catches a screen that cannot render (most often damaged saved data) and
// offers a calm way out. Resets itself when `resetKey` changes (the route).
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  componentDidUpdate(prev) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="cd" role="alert" style={{ textAlign: "center", padding: 32 }}>
        <h2 className="sf" tabIndex={-1} style={{ fontSize: "var(--fs-title)", fontWeight: 400, color: "#1A1A1A", marginBottom: 8 }}>
          Something went astray
        </h2>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
          Your data may be damaged. Export or start over in Settings.
        </p>
        <a className="btn btn-primary btn-tap" href={href("/settings")} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Open Settings
        </a>
      </div>
    );
  }
}
