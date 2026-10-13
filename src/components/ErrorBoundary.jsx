import { Component } from "react";
import { href } from "../lib/router.js";
import EmptyState from "./EmptyState.jsx";

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
      <EmptyState
        icon="alert"
        level={2}
        role="alert"
        titleProps={{ tabIndex: -1 }}
        title="Something went astray"
        action={
          <a className="btn btn-primary btn-tap" href={href("/settings")}>
            Open Settings
          </a>
        }
      >
        Your data may be damaged. Export or start over in Settings.
      </EmptyState>
    );
  }
}
