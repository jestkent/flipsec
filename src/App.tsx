import { useState } from "react";
import About from "./components/About";
import Feed from "./components/Feed";
import Header, { type View } from "./components/Header";
import Home from "./components/Home";

// The three feeds, in the order they appear. Reordering the app is editing
// this array; nothing else reads a hard-coded list of kinds.
//
// The kind values are the database's and do not change; only the labels do.
// Renaming them would mean migrating every published row for a word on a
// button, and the news feed is the demo.
export const TABS = [
  { kind: "scam", label: "News", full: "AI Security News" },
  { kind: "course", label: "Learn", full: "AI Security Education" },
  { kind: "job", label: "Jobs", full: "AI Security Jobs" },
] as const;

const FEED_INTRO: Record<string, string> = {
  scam: "Real reports of AI used against people. Flip a card for the lesson built from that exact story.",
  course:
    "Free guides to how AI gets attacked and defended. Flip a card for what you will learn and where to begin.",
  job: "Openings where AI and security genuinely meet. Flip a card for what they want and how to apply.",
};

export default function App() {
  // Four views in state, still no router. The whole app is three feeds, a
  // static page and a home page; a routing dependency would not earn itself.
  const [view, setView] = useState<View>("home");
  const [kind, setKind] = useState<string>(TABS[0].kind);

  function navigate(next: View, nextKind?: string) {
    if (nextKind) setKind(nextKind);
    setView(next);
    // Moving between views is a page change, so it starts at the top. Within
    // a view nothing scrolls on its own, which is what keeps a reader's place
    // when a card flips.
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  const active = TABS.find((t) => t.kind === kind) ?? TABS[0];

  return (
    <div className="min-h-screen bg-ivory">
      <a
        href="#main"
        className="sr-only rounded-control bg-navy px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <Header view={view} onNavigate={(v) => navigate(v)} />

      <main id="main" className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        {view === "home" && <Home onNavigate={navigate} />}

        {view === "about" && (
          <div className="mx-auto max-w-2xl pt-10">
            <About onBack={() => navigate("feed")} />
          </div>
        )}

        {view === "feed" && (
          <div className="mx-auto max-w-2xl pt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-navy">
              {active.full}
            </h1>
            <p className="mt-2 max-w-[70ch] text-base leading-relaxed text-slate">
              {FEED_INTRO[kind] ?? FEED_INTRO.scam}
            </p>

            {/* Wraps, because three labels at these widths overflowed a 360px
                phone when the row could not break. */}
            <nav
              aria-label="Feeds"
              className="mt-5 mb-7 flex flex-wrap gap-2 border-b border-line pb-px"
            >
              {TABS.map((tab) => {
                const selected = tab.kind === kind;
                return (
                  <button
                    key={tab.kind}
                    type="button"
                    onClick={() => setKind(tab.kind)}
                    aria-current={selected ? "page" : undefined}
                    className={[
                      "min-h-11 rounded-t-control px-4 text-base transition-colors",
                      // A bottom rule rather than a filled pill, and the
                      // weight changes too, so the selection is not carried
                      // by colour alone.
                      selected
                        ? "-mb-px border-b-2 border-sage font-semibold text-navy"
                        : "-mb-px border-b-2 border-transparent font-medium text-slate hover:text-navy",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Keyed by kind so switching tabs mounts a fresh feed rather than
                re-using the previous tab's flipped cards and measured
                heights. */}
            <Feed key={kind} kind={kind} />
          </div>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-slate sm:px-6">
          <img
            src="/brand/flipsec-ai-logo.png"
            srcSet="/brand/flipsec-ai-logo.png 1x, /brand/flipsec-ai-logo@2x.png 2x"
            width={112}
            height={28}
            alt="FlipSec.ai"
            className="h-7 w-auto object-contain"
          />
          <span>Flip the news. Learn the threat.</span>
          <button
            type="button"
            onClick={() => navigate("about")}
            className="min-h-11 underline underline-offset-4 hover:text-navy"
          >
            Sources and licensing
          </button>
          <a
            href="https://github.com/jestkent/flipsec"
            target="_blank"
            rel="noreferrer"
            className="min-h-11 content-center underline underline-offset-4 hover:text-navy"
          >
            Source code
          </a>
        </div>
      </footer>
    </div>
  );
}
