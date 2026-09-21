import { Component, type ErrorInfo, type ReactNode } from "react";

// The app had no error boundary at all, so one thrown render error anywhere
// left a blank white page. That is the worst outcome for the people this is
// written for: a screen reader announces nothing, and a reader who is not
// technical has no way to tell a crash from a slow connection.
//
// A class component because that is still the only way to catch a render
// error in React. Nothing else in the app is one.
//
// Deliberately NOT a reload button. A crash that reproduces on mount would
// loop, and the flip state a reader was in is not worth restoring badly. The
// two exits are reading the feed again and going home, which are the two
// things that were always going to work.
type State = { failed: boolean };

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Goes to the browser console only. Never rendered: a stack trace tells a
    // reader nothing and can carry internal paths.
    console.error("FlipSec render error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-2xl font-semibold text-navy">
          Something went wrong on this page
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink">
          The fault is ours, not yours, and nothing you typed was sent anywhere.
          Opening FlipSec.ai again usually clears it.
        </p>
        <p className="mt-6">
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-control bg-sage px-4 text-base font-semibold text-white hover:bg-sage-deep"
          >
            Back to FlipSec.ai
          </a>
        </p>
      </main>
    );
  }
}
