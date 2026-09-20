import { useQuery } from "convex/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import LessonBack from "./LessonBack";
import TacticArt from "./TacticArt";

type Story = Omit<Doc<"stories">, "rawText">;

// The one place colour carries meaning, per PLAN.md section 16.
const TACTIC_STYLE: Record<string, string> = {
  deepfake: "bg-violet-50 text-violet-700",
  voice: "bg-amber-50 text-amber-700",
  phishing: "bg-sky-50 text-sky-700",
  injection: "bg-teal-50 text-teal-700",
  other: "bg-neutral-100 text-neutral-600",
};

function timeAgo(ms: number | undefined): string {
  if (ms === undefined) return "";
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
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
  const [height, setHeight] = useState<number>();

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Only load the drill once the reader actually flips. Loading one per post
  // would open a subscription for every card in the feed.
  const drill = useQuery(
    api.drills.drillForStory,
    flipped ? { storyId: story._id } : "skip",
  );

  // Both faces are absolutely positioned, so the container has no natural
  // height. Measure both and lock to the taller one or the feed jumps
  // mid-flip.
  useLayoutEffect(() => {
    function measure() {
      const front = frontRef.current?.scrollHeight ?? 0;
      const back = backRef.current?.scrollHeight ?? 0;
      const next = Math.max(front, back);
      if (next > 0) setHeight(next);
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
    setFlipping(true);
    setFlipped((f) => !f);
  }

  const tactic = story.tactic ?? "other";

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
        <div ref={frontRef} className="face face-front flex flex-col">
          <div className="h-40 w-full shrink-0 overflow-hidden border-b border-neutral-100 bg-neutral-50">
            {story.image ? (
              <img
                src={story.image}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <TacticArt tactic={tactic} />
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
            <span className="text-sm text-neutral-400">
              · {timeAgo(story.publishedAt)}
            </span>
          </header>

          <p className="text-lg leading-snug font-medium text-neutral-900">
            {story.summary}
          </p>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                TACTIC_STYLE[tactic] ?? TACTIC_STYLE.other
              }`}
            >
              {tactic}
            </span>
            {story.redFlags?.map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"
              >
                {flag}
              </span>
            ))}
          </div>

          <footer className="mt-auto flex items-center gap-5 pt-2">
            <button
              type="button"
              onClick={flip}
              aria-expanded={flipped}
              className="text-sm font-semibold text-neutral-900 hover:text-neutral-600"
            >
              ↻ How this works
            </button>
            <a
              href={story.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              ↗ Source
            </a>
          </footer>
          </div>
        </div>

        <div ref={backRef} className="face face-back">
          <LessonBack
            drill={drill}
            storyId={story._id}
            tactic={tactic}
            userId={userId}
            onBack={flip}
          />
        </div>
      </div>
    </article>
  );
}
