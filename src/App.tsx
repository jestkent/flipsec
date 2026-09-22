import { useEffect, useRef, useState } from "react";
import About from "./components/About";
import { DEMOS, findDemo } from "./components/demoRegistry";
import Privacy from "./components/Privacy";
import Feed from "./components/Feed";
import Header, { type View } from "./components/Header";
import Home from "./components/Home";
import SafetyTools from "./components/SafetyTools";
import { languageInfo, useLanguage } from "./localization";
import { navigateTo, useRoute } from "./navigation";
import { PRACTICE } from "./practiceCopy";
import { onboardingCopy } from "./onboardingCopy";
import { useStickyVar } from "./stickyChrome";

// The three feeds, in the order they appear. Reordering the app is editing
// this array; nothing else reads a hard-coded list of kinds.
//
// The kind values are the database's and do not change; only the labels do.
// Renaming them would mean migrating every published row for a word on a
// button, and the news feed is the demo.
export const TABS = [
  { kind: "scam", label: "AI Sec News", full: "AI Sec News" },
  { kind: "course", label: "AI Sec Learn", full: "AI Sec Learn" },
  { kind: "job", label: "AI Sec Jobs", full: "AI Sec Jobs" },
] as const;

const STACK = [
  { name: "Firecrawl", role: "Collects public source material" },
  { name: "OpenAI", role: "Writes explanations and powers Ask FlipSec" },
  { name: "Convex", role: "Runs realtime data, agents, schedules and hosting" },
  { name: "AgentMail", role: "Sends daily lessons and handles replies" },
] as const;


export default function App() {
  const { t, language } = useLanguage();
  const route = useRoute();
  const { view, kind } = route;
  const announcement = route.missing ? "Page not found" : view === "feed" ? `${kind} feed` : `${view} page`;
  // Which interactive lesson is open on the Ask FlipSec page. Defaults to the
  // first, so the section is never an empty row of buttons.
  const [demo, setDemo] = useState<string>(DEMOS[0].key);
  const mainRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabsRef = useRef<HTMLElement>(null);
  // Published so index.css can keep a focused or linked card clear of the
  // sticky chrome. WCAG 2.2 SC 2.4.11: a sticky bar that covers the thing you
  // just tabbed to is a failure, and this one would sit right over the top of
  // the next card down.
  useStickyVar(tabsRef, "--tabs-h");

  const active = TABS.find((t) => t.kind === kind) ?? TABS[0];
  const openDemo = findDemo(demo);
  const localizedFeedName = active.kind === "scam" ? t("news") : active.kind === "course" ? t("learn") : t("jobs");

  useEffect(() => {
    // Browser history and direct card links are page changes too.
    window.scrollTo({ top: 0, behavior: "auto" });
    mainRef.current?.focus();
  }, [view, route.storyId, route.missing]);

  useEffect(() => {
    // Home is the brand on its own. Falling through to a "FlipSec.ai" page
    // name gave it the title "FlipSec.ai | FlipSec.ai", which a screen reader
    // announces twice on the first page a reader lands on.
    const page = view === "feed" ? localizedFeedName : view === "tools" ? "Ask FlipSec" : view === "about" ? t("about") : view === "privacy" ? "Privacy" : null;
    document.title = page ? `${page} | FlipSec.ai` : "FlipSec.ai";
  }, [localizedFeedName, t, view]);

  function navigate(next: View, nextKind?: string) {
    navigateTo({ view: next, kind: nextKind ?? kind });
    // Moving between views is a page change, so it starts at the top. Within
    // a view nothing scrolls on its own, which is what keeps a reader's place
    // when a card flips.
    window.scrollTo({ top: 0, behavior: "auto" });
    requestAnimationFrame(() => mainRef.current?.focus());
  }

  function selectFeed(nextKind: string) {
    navigateTo({ view: "feed", kind: nextKind });
  }

  function moveFeedTab(event: React.KeyboardEvent, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? TABS.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    selectFeed(TABS[nextIndex].kind);
    requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  }

  return (
    <div className="min-h-screen bg-ivory">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
          mainRef.current?.scrollIntoView({ block: "start" });
        }}
        className="sr-only rounded-control bg-navy px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      <Header view={view} onNavigate={(v) => navigate(v)} />

      <main ref={mainRef} id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        {route.missing ? (
          <section lang="en" className="mx-auto max-w-2xl py-10">
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="mt-3">This link does not point to a page in FlipSec.</p>
            <button className="mt-4 min-h-11 underline" onClick={() => navigate("home")}>Go to the home page</button>
          </section>
        ) : view === "home" && <Home onNavigate={navigate} />}

        {view === "tools" && (
          <div className="mx-auto max-w-2xl pt-8">
            <SafetyTools />

            {/* Behind a flip, on card one of twelve, under a sign-up box was
                too well hidden: the person who asked for it could not find it.
                Ask FlipSec is where a reader brings something suspicious, so
                the lessons about how they are being fooled belong directly
                underneath, in the open, with nothing to turn over first.

                One at a time rather than four stacked, because the page is
                already long and four interactive blocks would bury the
                conversation the reader came for. The cards in AI Sec Learn
                stay; this is the way in that does not depend on finding them. */}
            {/* lang="en" because everything in here -- the heading, the four
                labels and blurbs from demoRegistry, and the lesson itself --
                is still written in English while <html lang> says otherwise.
                A screen reader would otherwise pronounce English through the
                reader's chosen voice. The note below keeps its own lang. */}
            <section
              lang="en"
              aria-labelledby="demos-heading"
              className="mt-10 rounded-card border border-line bg-white"
            >
              <div className="border-b border-line px-6 pt-6 pb-5">
                <p className="text-sm font-semibold tracking-widest text-slate uppercase">
                  Try it yourself
                </p>
                <h2 id="demos-heading" className="mt-1 text-xl font-semibold text-navy">
                  See how it is done to you
                </h2>
                <p className="mt-2 text-base leading-relaxed text-ink">
                  Four short things you can try. None of them need an account
                  and your practice choices stay on this page. Playing the
                  voice example uses the same online speech service as Read aloud.
                </p>
                {language !== "en" && (
                  <p
                    lang={languageInfo(language).htmlLang}
                    className="mt-2 text-base text-slate"
                  >
                    {onboardingCopy(language).scope}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  {DEMOS.map((item) => {
                    const open = item.key === demo;
                    return (
                      <button
                        key={item.key}
                        lang={languageInfo(language).htmlLang}
                        type="button"
                        onClick={() => setDemo(item.key)}
                        aria-pressed={open}
                        className={`flex min-h-11 flex-col items-start rounded-control border px-4 py-2 text-left transition-colors ${
                          open
                            ? "border-navy bg-ivory"
                            : "border-line hover:border-navy-soft"
                        }`}
                      >
                        <span className={`text-base ${open ? "font-semibold text-navy" : "font-medium text-navy"}`}>
                          {language === "en" ? item.label : PRACTICE[language].scenarios[DEMOS.indexOf(item)]}
                        </span>
                        {language === "en" && <span className="text-sm text-slate">{item.blurb}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {openDemo && <openDemo.Component />}
            </section>
          </div>
        )}

        {view === "about" && (
          <div className="mx-auto max-w-2xl pt-10">
            <About onBack={() => navigate("feed")} />
          </div>
        )}

        {view === "privacy" && (
          <div className="mx-auto max-w-2xl pt-10">
            <Privacy onBack={() => navigate("feed")} />
          </div>
        )}

        {view === "feed" && (
          <div className="mx-auto max-w-2xl pt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-navy">
              {localizedFeedName}
            </h1>
            <p className="mt-2 max-w-[70ch] text-base leading-relaxed text-slate">
              {kind === "scam" ? t("newsIntro") : kind === "course" ? t("learnIntro") : t("jobsIntro")}
            </p>

            {/* Wraps, because three labels at these widths overflowed a 360px
                phone when the row could not break.

                Sticky under the header, so a reader who has scrolled to the
                bottom of a feed can switch to another one without scrolling
                all the way back up. The offset is --header-h, measured rather
                than hardcoded: the header wraps at narrow widths and grows
                with browser zoom and the larger-text preference, and any fixed
                number would be wrong in all three cases.

                z-10 keeps it under the header's z-20, and the background is
                opaque enough that cards do not show through as they pass. */}
            <nav
              ref={tabsRef}
              aria-label="Feeds"
              role="tablist"
              className="sticky z-10 mt-5 mb-7 flex flex-wrap gap-2 border-b border-line bg-ivory/95 pb-px backdrop-blur-sm"
              style={{ top: "var(--header-h, 4rem)" }}
            >
              {TABS.map((tab, index) => {
                const selected = tab.kind === kind;
                return (
                  <button
                    ref={(node) => { tabRefs.current[index] = node; }}
                    key={tab.kind}
                    type="button"
                    id={`feed-tab-${tab.kind}`}
                    role="tab"
                    onClick={() => selectFeed(tab.kind)}
                    onKeyDown={(event) => moveFeedTab(event, index)}
                    aria-selected={selected}
                    aria-controls="feed-panel"
                    tabIndex={selected ? 0 : -1}
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
                    {tab.kind === "scam" ? t("news") : tab.kind === "course" ? t("learn") : t("jobs")}
                  </button>
                );
              })}
            </nav>

            {/* Keyed by kind so switching tabs mounts a fresh feed rather than
                re-using the previous tab's flipped cards and measured
                heights. */}
            <section
              id="feed-panel"
              role="tabpanel"
              aria-labelledby={`feed-tab-${kind}`}
            >
              <Feed key={`${kind}:${route.storyId ?? ""}`} kind={kind} storyId={route.storyId} />
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-line bg-white/45">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <section aria-labelledby="built-with">
            <p id="built-with" className="text-sm font-semibold tracking-wider text-slate uppercase">Built with</p>
            <ul className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {STACK.map((tool) => (
                <li key={tool.name} className="border-t border-line pt-3">
                  <p className="text-base font-semibold text-navy">{tool.name}</p>
                  <p className="mt-1 text-base leading-relaxed text-slate">{tool.role}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6 text-base text-slate">
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
            <button
              type="button"
              onClick={() => navigate("privacy")}
              className="min-h-11 underline underline-offset-4 hover:text-navy"
            >
              Privacy
            </button>
            <a
              href="https://github.com/jestkent/flipsec"
              target="_blank"
              rel="noreferrer"
              className="min-h-11 content-center underline underline-offset-4 hover:text-navy"
            >
              Source code <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
