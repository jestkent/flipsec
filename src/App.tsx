import { useState } from "react";
import About from "./components/About";
import Feed from "./components/Feed";

// The three feeds, in the order they appear. Reordering the app is editing
// this array; nothing else reads a hard-coded list of kinds.
export const TABS = [
  { kind: "scam", label: "Scams" },
  { kind: "course", label: "Learn AI" },
  { kind: "job", label: "Jobs" },
] as const;

export default function App() {
  // Three feeds and an About page, all in state. Still no router: the whole
  // app is four views and one of them is a static page.
  const [kind, setKind] = useState<string>(TABS[0].kind);
  const [view, setView] = useState<"feed" | "about">("feed");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="mx-auto flex max-w-xl items-start justify-between px-4 pt-12 pb-5">
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

      {/* Hidden on the About page, which is not one of the feeds. */}
      {view === "feed" && (
        <nav
          aria-label="Feeds"
          className="mx-auto mb-6 flex max-w-xl gap-2 px-4"
        >
          {TABS.map((tab) => {
            const active = tab.kind === kind;
            return (
              <button
                key={tab.kind}
                type="button"
                onClick={() => setKind(tab.kind)}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-900",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      )}

      <main className="mx-auto max-w-xl px-4 pb-24">
        {view === "about" ? (
          <About onBack={() => setView("feed")} />
        ) : (
          // Keyed by kind so switching tabs mounts a fresh feed rather than
          // re-using the previous tab's flipped cards and measured heights.
          <Feed key={kind} kind={kind} />
        )}
      </main>
    </div>
  );
}
