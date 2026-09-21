// The home page. It exists because the app previously opened straight onto a
// feed, which gave a first-time reader no idea what the thing was or why the
// cards turn over.
//
// Everything here except the hero copy is real. The counts, the freshest
// card and the timestamp all come from the same live queries the feeds use,
// so nothing on this page can claim something the database does not hold.

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { View } from "./Header";
import ReadAloudButton from "./ReadAloudButton";
import { useLanguage } from "../localization";
import { Button, Card, CardSkeleton, Eyebrow, EmptyState } from "./ui";

const PATHWAYS = [
  {
    kind: "scam",
    name: "AI Sec News",
    benefit:
      "Read what actually happened to someone this week, then turn the card over for the lesson built from that story.",
  },
  {
    kind: "course",
    name: "AI Sec Learn",
    benefit:
      "Free guides to how AI gets attacked and defended, each one cut down to what you will learn and where to start.",
  },
  {
    kind: "job",
    name: "AI Sec Jobs",
    benefit:
      "Open roles where AI and security genuinely meet, with what the employer wants and whether you would fit.",
  },
] as const;

const STEPS = [
  {
    title: "Read what happened",
    body: "Real reports, rewritten so anyone can read them. No jargon and no background assumed.",
  },
  {
    title: "Flip for the lesson",
    body: "See how the threat worked, what gave it away, and why it convinced someone careful.",
  },
  {
    title: "Use what you learned",
    body: "Ask a question, practise spotting it, or get one card a day by email.",
  },
];

export default function Home({
  onNavigate,
}: {
  onNavigate: (view: View, kind?: string) => void;
}) {
  const { t } = useLanguage();
  // The same queries the feeds run. Convex keeps these live, so a crawl that
  // publishes while this page is open changes the numbers under the reader
  // without a refresh.
  const news = useQuery(api.stories.listPublished, { kind: "scam", limit: 30 });
  const edu = useQuery(api.stories.listPublished, { kind: "course", limit: 30 });
  const jobs = useQuery(api.stories.listPublished, { kind: "job", limit: 30 });

  const loading = news === undefined || edu === undefined || jobs === undefined;
  const featured = news?.[0];

  const freshest = [...(news ?? []), ...(edu ?? []), ...(jobs ?? [])]
    .map((s) => s.publishedAt ?? 0)
    .sort((a, b) => b - a)[0];

  return (
    <div lang="en" className="flex flex-col gap-16 pb-8">
      {/* This whole view is still written in English while <html lang> carries
    the reader's chosen language, so it declares its own. Without it a
    screen reader reads English prose through the wrong voice (WCAG 2.2
    SC 3.1.2), and a browser's translator cannot see anything to offer to
    translate. Remove lang="en" at the same time as translating it. */}
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="pt-10 sm:pt-14">
        {/* The lockup used to open this section. It is gone on purpose: the
            header shows the same artwork a hundred pixels above, so the hero
            was spending its most valuable space repeating the name instead of
            saying what the site does. The headline leads now. */}
        <h1 className="max-w-[22ch] text-3xl leading-tight font-semibold tracking-tight text-navy sm:text-4xl">
          Flip the news. Learn the threat.
        </h1>
        <p className="mt-4 max-w-[68ch] text-lg leading-relaxed text-ink">
          Scammers started using AI, and the old advice stopped working. Bad
          spelling used to be how you spotted a fake. Now a video call can show
          a face you know, and a voice on the phone can sound like family.
          FlipSec.ai collects what is really happening and explains it in plain
          words.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button onClick={() => onNavigate("feed", "scam")}>
            Read this week's stories
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("tools")}>
            Ask FlipSec
          </Button>
        </div>

        {/* This was a row of big numbers under four labels, which is the
            house style of every generated landing page and says less than a
            sentence does. Same live data, read as English. */}
        <p aria-live="polite" className="mt-8 border-t border-line pt-5 text-base text-slate">
          {loading ? (
            "Counting what is in the feeds…"
          ) : (
            <>
              Right now: {news?.length ?? 0} stories, {edu?.length ?? 0} guides
              and {jobs?.length ?? 0} open roles
              {freshest
                ? `, last collected ${new Date(freshest).toLocaleDateString(
                    undefined,
                    { month: "long", day: "numeric" },
                  )}`
                : ""}
              .
            </>
          )}
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Three pathways                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="pathways">
        <Eyebrow>Three feeds</Eyebrow>
        <h2
          id="pathways"
          className="mt-2 text-2xl font-semibold tracking-tight text-navy"
        >
          Pick where to start
        </h2>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {PATHWAYS.map((path) => (
            <article key={path.kind} className="flex flex-col border-t border-line pt-4">
              <h3 className="text-base font-semibold text-navy">
                {path.name}
              </h3>
              <p className="mt-2 flex-1 text-base leading-relaxed text-slate">
                {path.benefit}
              </p>
              <button
                type="button"
                onClick={() => onNavigate("feed", path.kind)}
                className="mt-4 min-h-11 self-start rounded-control text-base font-semibold text-sage-deep hover:underline"
              >
                Open this feed →
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How it works                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="how">
        <Eyebrow>How FlipSec.ai works</Eyebrow>
        <h2
          id="how"
          className="mt-2 text-2xl font-semibold tracking-tight text-navy"
        >
          Three steps, about a minute
        </h2>

        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="border-t-2 border-line pt-4 first:border-amber"
            >
              <span className="text-base font-semibold text-slate tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 text-base font-semibold text-navy">
                {step.title}
              </h3>
              <p className="mt-1.5 text-base leading-relaxed text-slate">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Featured, from real data                                            */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="latest">
        <Eyebrow>Latest story</Eyebrow>
        <h2
          id="latest"
          className="mt-2 text-2xl font-semibold tracking-tight text-navy"
        >
          Most recently collected
        </h2>

        <div className="mt-6">
          {loading ? (
            <div aria-busy="true" aria-live="polite">
              <span className="sr-only">Loading the latest story</span>
              <CardSkeleton />
            </div>
          ) : featured ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-base font-semibold text-navy">
                  {featured.source}
                </span>
                <span className="text-base text-slate" aria-hidden>
                  ·
                </span>
                <time
                  dateTime={
                    featured.publishedAt
                      ? new Date(featured.publishedAt).toISOString()
                      : undefined
                  }
                  className="text-base text-slate"
                >
                  {featured.publishedAt
                    ? new Date(featured.publishedAt).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "short", day: "numeric" },
                      )
                    : "date unknown"}
                </time>
              </div>
              <h3 className="mt-3 text-xl leading-snug font-semibold text-navy">
                {featured.title}
              </h3>
              <p className="mt-2 max-w-[70ch] text-base leading-relaxed text-ink">
                {featured.summary}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ReadAloudButton
                  text={`${featured.source}. ${featured.title}. ${featured.summary ?? ""}`}
                  label={t("readStory")}
                />
                <Button size="sm" onClick={() => onNavigate("feed", "scam")}>
                  Flip this card in the feed
                </Button>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="Nothing collected yet"
              body="The crawler runs every six hours. The first cards will appear here on their own."
            />
          )}
        </div>
      </section>

    </div>
  );
}
