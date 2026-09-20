import { useState } from "react";
import About from "./components/About";
import Feed from "./components/Feed";

export default function App() {
  // Two views, no router. A dependency for one link would not earn itself.
  const [view, setView] = useState<"feed" | "about">("feed");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="mx-auto flex max-w-xl items-start justify-between px-4 pt-12 pb-8">
        <div>
          <button
            type="button"
            onClick={() => setView("feed")}
            className="block text-left text-2xl font-semibold tracking-tight text-neutral-900"
          >
            FlipSec
          </button>
          <p className="mt-1 text-sm text-neutral-500">
            Flip the news. Learn the threat.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setView(view === "about" ? "feed" : "about")}
          aria-pressed={view === "about"}
          className="mt-1 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          {view === "about" ? "Feed" : "About"}
        </button>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-24">
        {view === "about" ? (
          <About onBack={() => setView("feed")} />
        ) : (
          <Feed />
        )}
      </main>
    </div>
  );
}
