import { useQuery } from "convex/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import CourseBack from "./CourseBack";
import JobBack from "./JobBack";
import LessonBack from "./LessonBack";
import TacticArt from "./TacticArt";
import { Badge } from "./ui";

type Story = Omit<Doc<"stories">, "rawText">;

// Tone, not a rainbow. The chip says its own word, so colour is reinforcement
// and never the only signal.
const CHIP_TONE: Record<string, "neutral" | "accent" | "highlight" | "danger" | "success"> = {
  deepfake: "danger",
  voice: "highlight",
  phishing: "danger",
  injection: "accent",
  other: "neutral",
  beginner: "success",
  intermediate: "accent",
  advanced: "highlight",
  hiring: "accent",
};

// What the flip promises, per feed. The card says what is behind it rather
// than just offering to turn over.
const FLIP_LABEL: Record<string, string> = {
  scam: "See how this works",
  course: "What you will learn",
  job: "What they want",
};

const BACK_LABEL: Record<string, string> = {
  scam: "Back to the story",
  course: "Back to the guide",
  job: "Back to the role",
};

// Cards carry a real date as well as a relative one. "3d" tells a reader how
// fresh it is; the date tells them what they are looking at when they come
// back to it later.
function timeAgo(ms: number | undefined): string {
  if (ms === undefined) return "";
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function fullDate(ms: number | undefined): string {
  if (ms === undefined) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Drawn, not typed. This was U+293E, an arrow from Supplemental Arrows-B:
// Source Sans 3 does not contain it and neither do most UI fonts, so it
// rendered as an empty box or as nothing at all. An icon in an interface has
// to be a shape we ship, not a codepoint we hope the font has.
//
// A card with an arrow crossing it: go to the other side. It mirrors when the
// card is already flipped, so the arrow always points the way it will go.
function FlipIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
      focusable="false"
      className={`shrink-0 transition-transform duration-200 ${
        flipped ? "-scale-x-100" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M8.5 12h7M13 9.5l2.5 2.5L13 14.5" />
    </svg>
  );
}

// The flip control. A labelled button, not a mystery roundel: the floating
// icon-only badge asked the reader to guess, and the label is what a screen
// reader reads without an aria-label carrying the whole meaning.
//
// On the front it is the card's primary action and looks like one, because
// the flip is the entire point of the product and was previously the least
// prominent thing on the card. On the back it is quieter, since by then the
// reader is reading rather than deciding.
function FlipControl({
  flipped,
  kind,
  onFlip,
  prominent = false,
}: {
  flipped: boolean;
  kind: string;
  onFlip: () => void;
  prominent?: boolean;
}) {
  const label = flipped
    ? (BACK_LABEL[kind] ?? BACK_LABEL.scam)
    : (FLIP_LABEL[kind] ?? FLIP_LABEL.scam);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onFlip();
      }}
      aria-expanded={flipped}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-control",
        "text-base font-semibold transition-colors",
        prominent
          ? "w-full bg-teal px-4 text-white hover:bg-teal-deep"
          : "px-3 text-teal-deep hover:bg-teal/[0.08]",
      ].join(" ")}
    >
      <FlipIcon flipped={flipped} />
      {label}
    </button>
  );
}

export default function Post({
  story,
  userId,
}: {
  story: Story;
  userId: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [shownFace, setShownFace] = useState<"front" | "back">("front");
  const [sizes, setSizes] = useState({ front: 0, back: 0 });
  const [imageFailed, setImageFailed] = useState(false);

  // These wrap the contents of each face. The faces themselves are absolutely
  // positioned at inset 0, so their boxes are whatever height this component
  // sets and they never react to their own content. A ResizeObserver on a
  // face therefore never fires. These inner wrappers sit in normal flow, so
  // their height is the content height and the observer fires when, say, the
  // tutor lesson arrives.
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const artId = useId();

  const kind = story.kind ?? "scam";

  // Only load the drill once the reader actually flips. Loading one per post
  // would open a subscription for every card in the feed.
  //
  // Courses and jobs carry their whole back on the story row, so they never
  // open this subscription at all.
  const liveDrill = useQuery(
    api.drills.drillForStory,
    flipped && kind === "scam" ? { storyId: story._id } : "skip",
  );

  // Flipping back sets the query to "skip", which makes liveDrill undefined
  // again. Without this the back face would swap to its loading state while
  // it is still rotating away. Keep whatever was last loaded.
  const [drill, setDrill] = useState(liveDrill);
  useEffect(() => {
    if (liveDrill !== undefined) setDrill(liveDrill);
  }, [liveDrill]);

  // Both faces are absolutely positioned, so the container has no natural
  // height. Measure each one separately.
  useLayoutEffect(() => {
    function measure() {
      const front = frontRef.current?.offsetHeight ?? 0;
      const back = backRef.current?.offsetHeight ?? 0;
      setSizes((prev) =>
        prev.front === front && prev.back === back ? prev : { front, back },
      );
    }

    measure();

    const observer = new ResizeObserver(measure);
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);
    return () => observer.disconnect();
  }, [story._id, drill]);

  // Kept in step with --flip-duration in index.css. The rotation is 220ms, so
  // the midpoint is 110ms and will-change comes off a little after the end.
  const FLIP_MS = 220;

  // will-change only while the rotation is actually running.
  useEffect(() => {
    if (!flipping) return;
    const timer = setTimeout(() => setFlipping(false), FLIP_MS + 40);
    return () => clearTimeout(timer);
  }, [flipping]);

  function flip() {
    const next = flipped ? "front" : "back";
    setFlipping(true);
    setFlipped((f) => !f);

    // The lesson is much taller than the card front, so locking the card to
    // the taller of the two would leave every card in the feed as tall as its
    // own lesson. Instead the card is the height of the face being shown, and
    // the swap happens at the midpoint of the rotation, while the card is edge
    // on and the change cannot be seen. Still transform-only.
    //
    // The reader's place on the page is preserved by construction: the card
    // grows downward from a fixed top edge, and nothing above it moves.
    window.setTimeout(() => setShownFace(next), FLIP_MS / 2);
  }

  const tactic = story.tactic ?? "other";
  // A floor, because a mis-measured face used to collapse the card to a
  // sliver: the lesson had h-full and its own scrollbar, so it reported the
  // clamped height rather than its content, and that fed back in.
  const measured = sizes[shownFace];
  const height = measured > 0 ? Math.max(measured, 220) : undefined;
  const showArt = !story.image || imageFailed;

  return (
    <article className="post">
      <div
        className={[
          "post-inner rounded-card border border-line bg-white",
          flipped ? "flipped" : "",
          flipping ? "flipping" : "",
        ].join(" ")}
        style={{ height }}
      >
        {/* inert on the face that is turned away. backface-visibility hides a
            face from the eye but not from the keyboard or a screen reader, so
            without this every unflipped card still put its ask box, its
            buttons and its drill options in the tab order. */}
        <div
          className="face face-front"
          inert={flipped}
          aria-hidden={flipped}
        >
          {/* The brand motif, and the affordance: the corner you would lift
              to turn a page over. Decorative, so it is not announced. */}
          <span className="fold" aria-hidden />

          <div ref={frontRef} className="flex flex-col">
            <div className="h-36 w-full shrink-0 overflow-hidden border-b border-line bg-ivory">
              {showArt ? (
                <TacticArt tactic={tactic} uid={artId} />
              ) : (
                <img
                  src={story.image}
                  alt=""
                  loading="lazy"
                  onError={() => setImageFailed(true)}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
              {/* Source acts as the byline, the way a handle does in a feed,
                  which keeps attribution part of the design rather than a
                  footnote. The date is both relative and absolute: one says
                  how fresh, the other says which. */}
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {story.sourceIcon && (
                  <img
                    src={story.sourceIcon}
                    alt=""
                    width={18}
                    height={18}
                    className="rounded-sm"
                  />
                )}
                <span className="text-sm font-semibold text-navy">
                  {story.source}
                </span>
                <span className="text-sm text-slate" aria-hidden>
                  ·
                </span>
                <time
                  dateTime={
                    story.publishedAt
                      ? new Date(story.publishedAt).toISOString()
                      : undefined
                  }
                  title={fullDate(story.publishedAt)}
                  className="text-sm text-slate"
                >
                  {timeAgo(story.publishedAt)}
                </time>
              </header>

              <h3 className="clamp-2 text-lg leading-snug font-semibold text-navy">
                {story.title}
              </h3>

              <p className="clamp-3 text-base leading-relaxed text-ink">
                {story.summary}
              </p>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                <Badge tone={CHIP_TONE[tactic] ?? "neutral"}>{tactic}</Badge>
                <a
                  href={story.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-11 content-center text-sm font-medium text-slate underline decoration-line underline-offset-4 hover:text-navy"
                >
                  Original source
                </a>
              </div>

              <div className="border-t border-line pt-3">
                <FlipControl
                  flipped={flipped}
                  kind={kind}
                  onFlip={flip}
                  prominent
                />
              </div>
            </div>
          </div>
        </div>

        {/* The back holds inputs and buttons, so only the explicit control
            flips it back. */}
        <div className="face face-back" inert={!flipped} aria-hidden={!flipped}>
          {/* One flip, three backs. The rotation, the height measuring and
              the reduced-motion handling above are shared; only what is
              printed on the far face changes.

              The way back sits at the top as well as the bottom, because a
              lesson is long and a reader who wants out should not have to
              scroll to find the door. Both live inside the measured wrapper,
              or the card is sized without them and clips. */}
          <div ref={backRef}>
            <div className="flex items-center justify-between border-b border-line px-4 py-1">
              <FlipControl flipped={flipped} kind={kind} onFlip={flip} />
              <span className="pr-1 text-sm text-slate">{story.source}</span>
            </div>
            {kind === "course" ? (
              <CourseBack back={story.back} url={story.url} onBack={flip} />
            ) : kind === "job" ? (
              <JobBack back={story.back} url={story.url} onBack={flip} />
            ) : (
              <LessonBack
                drill={drill}
                storyId={story._id}
                tactic={tactic}
                redFlags={story.redFlags ?? []}
                userId={userId}
                onBack={flip}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
