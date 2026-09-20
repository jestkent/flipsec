import { useQuery } from "convex/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import CourseBack from "./CourseBack";
import JobBack from "./JobBack";
import LessonBack from "./LessonBack";
import TacticArt from "./TacticArt";

type Story = Omit<Doc<"stories">, "rawText">;

// The one place colour carries meaning, per PLAN.md section 16. The last four
// are the other two feeds: a course level, and where a job can be done.
const TACTIC_STYLE: Record<string, string> = {
  deepfake: "bg-violet-50 text-violet-700",
  voice: "bg-amber-50 text-amber-700",
  phishing: "bg-sky-50 text-sky-700",
  injection: "bg-teal-50 text-teal-700",
  other: "bg-neutral-100 text-neutral-600",
  beginner: "bg-emerald-50 text-emerald-700",
  intermediate: "bg-indigo-50 text-indigo-700",
  advanced: "bg-rose-50 text-rose-700",
  remote: "bg-cyan-50 text-cyan-700",
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
  course: "Back to the course",
  job: "Back to the job",
};

function timeAgo(ms: number | undefined): string {
  if (ms === undefined) return "";
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

// The badge sits on both faces so the way back is in the same place as the
// way in. It is a real button, which is what makes the flip keyboard
// reachable, per PLAN.md section 7.
function FlipBadge({
  flipped,
  kind,
  onFlip,
}: {
  flipped: boolean;
  kind: string;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onFlip();
      }}
      aria-expanded={flipped}
      aria-label={
        flipped
          ? (BACK_LABEL[kind] ?? BACK_LABEL.scam)
          : (FLIP_LABEL[kind] ?? FLIP_LABEL.scam)
      }
      className="absolute top-3 right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-lg text-neutral-900 shadow-md ring-1 ring-neutral-900/10 backdrop-blur transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-neutral-900"
    >
      <span aria-hidden>↻</span>
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

  // will-change only while the rotation is actually running.
  useEffect(() => {
    if (!flipping) return;
    const timer = setTimeout(() => setFlipping(false), 560);
    return () => clearTimeout(timer);
  }, [flipping]);

  function flip() {
    const next = flipped ? "front" : "back";
    setFlipping(true);
    setFlipped((f) => !f);

    // The lesson is much taller than the post, so locking the card to the
    // taller of the two would leave every card in the feed as tall as its
    // own lesson. Instead the card is the height of the face being shown,
    // and the swap happens at the midpoint of the 520ms rotation, while the
    // card is edge on and the change cannot be seen. Still transform-only.
    window.setTimeout(() => setShownFace(next), 260);
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
          "post-inner rounded-2xl border border-neutral-200 bg-white shadow-sm",
          flipped ? "flipped" : "",
          flipping ? "flipping" : "",
        ].join(" ")}
        style={{ height }}
      >
        {/* The whole front is the control. The badge is the accessible name
            and the keyboard path; this click target is the convenience. */}
        <div onClick={flip} className="face face-front cursor-pointer">
          <FlipBadge flipped={flipped} kind={kind} onFlip={flip} />

          <div ref={frontRef} className="flex flex-col">
            <div className="h-40 w-full shrink-0 overflow-hidden border-b border-neutral-100 bg-neutral-50">
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

            <div className="flex flex-1 flex-col gap-4 p-6">
              <header className="flex items-center gap-2">
                {story.sourceIcon && (
                  <img
                    src={story.sourceIcon}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded"
                  />
                )}
                <span className="text-sm font-semibold text-neutral-900">
                  {story.source}
                </span>
                <span className="text-sm text-neutral-500">
                  · {timeAgo(story.publishedAt)}
                </span>
              </header>

              {/* A scam post leads with what happened, so the headline would
                  only repeat the summary. A course and a job are named things
                  a reader is deciding between, so those two lead with the
                  name and the summary explains it. */}
              {kind === "scam" ? (
                <p className="text-lg leading-snug font-medium text-neutral-900">
                  {story.summary}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-lg leading-snug font-semibold text-neutral-900">
                    {story.title}
                  </p>
                  <p className="text-base leading-relaxed text-neutral-700">
                    {story.summary}
                  </p>
                </div>
              )}

              {/* Only the tactic stays on the front. The red flags belong with
                the explanation, so they live on the lesson. */}
              <span
                className={`self-start rounded-full px-2.5 py-1 text-xs font-medium ${
                  TACTIC_STYLE[tactic] ?? TACTIC_STYLE.other
                }`}
              >
                {tactic}
              </span>

              <footer className="mt-auto flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-neutral-900">
                  ↻ {FLIP_LABEL[kind] ?? FLIP_LABEL.scam}
                </span>
                <a
                  href={story.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-neutral-500 hover:text-neutral-900"
                >
                  ↗ Source
                </a>
              </footer>
            </div>
          </div>
        </div>

        {/* The back holds inputs and buttons, so only the badge and the
            explicit link flip it back. */}
        <div className="face face-back">
          <FlipBadge flipped={flipped} kind={kind} onFlip={flip} />
          {/* One flip, three backs. The rotation, the height measuring and
              the reduced-motion handling above are shared; only what is
              printed on the far face changes. */}
          <div ref={backRef}>
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
