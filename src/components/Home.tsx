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
import { Badge, Button, Card, CardSkeleton, Eyebrow, EmptyState } from "./ui";

const PATHWAYS = [
  {
    kind: "scam",
    name: "AI Security News",
    benefit:
      "Read what actually happened to someone this week, then turn the card over for the lesson built from that story.",
  },
  {
    kind: "course",
    name: "AI Security Education",
    benefit:
      "Free guides to how AI gets attacked and defended, each one cut down to what you will learn and where to start.",
  },
  {
    kind: "job",
    name: "AI Security Jobs",
    benefit:
      "Open roles where AI and security genuinely meet, with what the employer wants and whether you would fit.",
  },
] as const;

const STEPS = [
  {
    title: "Find a story",
    body: "Real reports, rewritten so anyone can read them. No jargon and no background assumed.",
  },
  {
    title: "Flip the card",
    body: "The front is what happened. The back is why it worked, which is the part nobody tells you.",
  },
  {
    title: "Understand the threat",
    body: "How the trick ran, what gave it away, and what the person on the other end was thinking.",
  },
  {
    title: "Do something with it",
    body: "Ask a question, practise spotting it, or get one card a day by email.",
  },
];

function Stat({
  value,
  label,
  loading,
}: {
  value: number | undefined;
  label: string;
  loading: boolean;
}) {
  return (
    <div>
      <p className="text-2xl font-semibold text-navy tabular-nums">
        {loading ? "—" : (value ?? 0)}
      </p>
      <p className="text-sm text-slate">{label}</p>
    </div>
  );
}

export default function Home({
  onNavigate,
}: {
  onNavigate: (view: View, kind?: string) => void;
}) {
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

  const countFor = (kind: string) =>
    kind === "scam" ? news?.length : kind === "course" ? edu?.length : jobs?.length;

  return (
    <div className="flex flex-col gap-16 pb-8">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="pt-10 sm:pt-14">
        {/* Here the logo is content rather than chrome: it is how the page
            states the product's name, so it carries a real alt rather than an
            empty one. */}
        <img
          src="/brand/flipsec-ai-logo.png"
          srcSet="/brand/flipsec-ai-logo.png 1x, /brand/flipsec-ai-logo@2x.png 2x"
          width={208}
          height={52}
          alt="FlipSec.ai"
          className="h-11 w-auto object-contain sm:h-13"
        />

        <h1 className="mt-6 max-w-[20ch] text-3xl leading-tight font-semibold tracking-tight text-navy sm:text-4xl">
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
          <Button variant="secondary" onClick={() => onNavigate("about")}>
            How it works
          </Button>
        </div>

        <div className="mt-9 flex flex-wrap items-end gap-8 border-t border-line pt-6">
          <Stat value={news?.length} label="Stories" loading={loading} />
          <Stat value={edu?.length} label="Guides" loading={loading} />
          <Stat value={jobs?.length} label="Open roles" loading={loading} />
          {freshest ? (
            <div>
              <p className="text-2xl font-semibold text-navy">
                {new Date(freshest).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-slate">Last collected</p>
            </div>
          ) : null}
        </div>
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

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PATHWAYS.map((path) => (
            <Card key={path.kind} className="flex flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-navy">
                  {path.name}
                </h3>
                <Badge tone="neutral">
                  {loading ? "—" : (countFor(path.kind) ?? 0)}
                </Badge>
              </div>
              <p className="mt-2 flex-1 text-base leading-relaxed text-slate">
                {path.benefit}
              </p>
              <button
                type="button"
                onClick={() => onNavigate("feed", path.kind)}
                className="mt-4 min-h-11 self-start rounded-control text-base font-semibold text-teal-deep hover:underline"
              >
                Open this feed →
              </button>
            </Card>
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
          Four steps, about a minute
        </h2>

        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="border-t-2 border-line pt-4 first:border-amber"
            >
              <span className="text-sm font-semibold text-slate tabular-nums">
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
            <CardSkeleton />
          ) : featured ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-navy">
                  {featured.source}
                </span>
                <span className="text-sm text-slate" aria-hidden>
                  ·
                </span>
                <time
                  dateTime={
                    featured.publishedAt
                      ? new Date(featured.publishedAt).toISOString()
                      : undefined
                  }
                  className="text-sm text-slate"
                >
                  {featured.publishedAt
                    ? new Date(featured.publishedAt).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "short", day: "numeric" },
                      )
                    : "date unknown"}
                </time>
              </div>
              <h3 className="clamp-2 mt-3 text-xl leading-snug font-semibold text-navy">
                {featured.title}
              </h3>
              <p className="mt-2 max-w-[70ch] text-base leading-relaxed text-ink">
                {featured.summary}
              </p>
              <div className="mt-5">
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

      {/* ------------------------------------------------------------------ */}
      {/* What is actually running                                            */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="built">
        <Eyebrow>What is running underneath</Eyebrow>
        <h2
          id="built"
          className="mt-2 text-2xl font-semibold tracking-tight text-navy"
        >
          Where the cards come from
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <h3 className="text-base font-semibold text-navy">
              Firecrawl reads the sources
            </h3>
            <p className="mt-2 text-base leading-relaxed text-slate">
              Every six hours it scrapes five public sources, honours each
              robots.txt and crawl delay, and skips anything already seen. The
              date on each card is when that page was collected.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-base font-semibold text-navy">
              OpenAI writes the card
            </h3>
            <p className="mt-2 text-base leading-relaxed text-slate">
              One call per item produces the summary, the lesson and the gates
              that decide whether it belongs here at all. Most candidates fail
              a gate and never reach a feed.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-base font-semibold text-navy">
              Convex keeps it live
            </h3>
            <p className="mt-2 text-base leading-relaxed text-slate">
              The counts above are a live query. When a crawl publishes while
              this page is open, they change on their own, with no refresh and
              no polling.
            </p>
          </Card>
        </div>

        <Card className="mt-4 p-5">
          <h3 className="text-base font-semibold text-navy">
            AgentMail carries it both ways
          </h3>
          <p className="mt-2 max-w-[72ch] text-base leading-relaxed text-slate">
            Sign up on any feed and one card a morning arrives by email. Reply
            to the practice question in your own words and the reply comes back
            read and answered, not just acknowledged. Every message carries a
            working unsubscribe link.
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate("feed", "scam")}
            >
              Sign up on the news feed
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
