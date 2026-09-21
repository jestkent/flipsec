import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import Illusion from "./Illusion";
import ScamFlow from "./ScamFlow";

type Drill = {
  _id: Id<"drills">;
  storyId: Id<"stories">;
  prompt: string;
  choices: string[];
  steps: string[];
  whyItWorks: string;
  illusion: Array<{ seen: string; real: string }>;
};

type Result = { correct: boolean; correctIndex: number; explanation: string };

export default function LessonBack({
  drill,
  storyId,
  tactic,
  redFlags,
  userId,
  onBack,
}: {
  drill: Drill | null | undefined;
  storyId: Id<"stories">;
  tactic: string;
  redFlags: string[];
  userId: string;
  onBack: () => void;
}) {
  const submit = useMutation(api.attempts.submitAnswer);
  const ask = useAction(api.questions.askAboutStory);
  const teach = useAction(api.lessons.teachLesson);

  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [practising, setPractising] = useState(false);

  const [lesson, setLesson] = useState<string | null>(null);
  const [teaching, setTeaching] = useState(false);

  const [failed, setFailed] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  // Every one of these calls a model over the network. Without a catch a
  // slow or failed call just reset the button and said nothing, which reads
  // as a broken app rather than a busy one.
  async function teachMe() {
    if (teaching || lesson !== null) return;
    setTeaching(true);
    setFailed(null);
    try {
      setLesson((await teach({ storyId, userId })).body);
    } catch {
      setFailed("That did not come through. Try again in a moment.");
    } finally {
      setTeaching(false);
    }
  }

  async function sendQuestion() {
    if (question.trim().length < 3 || asking) return;
    setAsking(true);
    setAnswer(null);
    setFailed(null);
    try {
      setAnswer((await ask({ userId, storyId, question })).answer);
      setQuestion("");
    } catch {
      setFailed("That did not come through. Try again in a moment.");
    } finally {
      setAsking(false);
    }
  }

  async function choose(index: number) {
    if (result !== null) return;
    setPicked(index);
    setFailed(null);
    try {
      setResult(await submit({ userId, drillId: drill!._id, choice: index }));
    } catch {
      setPicked(null);
      setFailed("That answer did not save. Try again in a moment.");
    }
  }

  if (drill === undefined) {
    return (
      <p className="min-h-56 p-6 text-sm text-slate">Opening the lesson…</p>
    );
  }

  if (drill === null) {
    return (
      <div className="flex min-h-56 flex-col gap-4 p-6">
        <p className="text-sm text-slate">
          No lesson for this one yet. Check back after the next crawl.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-medium text-slate hover:text-navy"
        >
          ← Back to the story
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <p className="text-xs font-semibold tracking-widest text-slate uppercase">
        How this works
      </p>

      {/* One place for any of the three network failures. role="status" so a
          screen reader hears it without the focus moving. */}
      {failed !== null && (
        <p
          role="status"
          className="rounded-control bg-[#c94f450d] px-3 py-2 text-base text-danger"
        >
          {failed}
        </p>
      )}

      <ScamFlow steps={drill.steps} tactic={tactic} />

      {/* Moved off the front of the post. They read better next to the
          explanation than as a wall of chips above the summary. */}
      {redFlags.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate uppercase">
            What gives it away
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {redFlags.map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-ivory px-2.5 py-1 text-xs text-slate"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {(drill.illusion.length > 0 || drill.whyItWorks) && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-wider text-slate uppercase">
            Why it works
          </p>
          <Illusion pairs={drill.illusion} tactic={tactic} />
          {drill.whyItWorks && (
            <p className="text-base leading-relaxed text-ink">
              {drill.whyItWorks}
            </p>
          )}
        </div>
      )}

      {/* The tutor. Generated once per story on the server and kept. */}
      {lesson === null ? (
        <button
          type="button"
          onClick={() => void teachMe()}
          disabled={teaching}
          className="self-start rounded-control bg-sage px-4 py-2.5 text-base font-semibold text-white hover:bg-sage-deep disabled:opacity-50"
        >
          {teaching ? "Writing your lesson…" : "Teach me how this works →"}
        </button>
      ) : (
        <div className="flex flex-col gap-3 border-l-2 border-navy pl-4">
          {lesson.split(/\n\n+/).map((para) => (
            <p key={para} className="text-base leading-relaxed text-ink">
              {para}
            </p>
          ))}
        </div>
      )}

      <div className="rounded-card bg-ivory p-3">
        <label
          htmlFor={`ask-${drill._id}`}
          className="text-sm font-semibold text-slate"
        >
          Ask anything about this scam
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id={`ask-${drill._id}`}
            value={question}
            maxLength={200}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendQuestion();
            }}
            placeholder="How would I check if it is really them?"
            className="min-w-0 flex-1 rounded-control border border-line bg-white px-3 py-2 text-base outline-none focus:border-sage"
          />
          <button
            type="button"
            onClick={() => void sendQuestion()}
            disabled={asking || question.trim().length < 3}
            className="rounded-control bg-sage px-4 py-2 text-base font-semibold text-white hover:bg-sage-deep disabled:opacity-40"
          >
            {asking ? "…" : "Ask"}
          </button>
        </div>
        {answer !== null && (
          <p className="mt-3 text-base leading-relaxed text-ink">
            {answer}
          </p>
        )}
      </div>

      {/* Practice is offered, never a gate. The lesson is the flip. */}
      <div className="border-t border-line pt-4">
        {!practising ? (
          <button
            type="button"
            onClick={() => setPractising(true)}
            className="text-sm font-medium text-slate hover:text-navy"
          >
            Try spotting it yourself →
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-navy">
              {drill.prompt}
            </p>

            <div className="flex flex-col gap-2">
              {drill.choices.map((choice, i) => {
                const isAnswer = result !== null && i === result.correctIndex;
                const isWrong =
                  result !== null && i === picked && !result.correct;

                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={result !== null}
                    onClick={() => void choose(i)}
                    className={[
                      "rounded-card border px-4 py-3 text-left text-sm transition-colors",
                      isAnswer
                        ? "border-success bg-[#2f7d5b0d] text-success"
                        : isWrong
                          ? "border-[#c94f4566] bg-[#c94f450d] text-danger"
                          : "border-line text-ink enabled:hover:border-navy-soft",
                    ].join(" ")}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {result !== null && (
              <p className="text-base leading-relaxed text-ink">
                <span className="font-semibold text-navy">
                  {result.correct ? "That's the one. " : "Not quite. "}
                </span>
                {result.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="self-start pt-2 text-sm font-medium text-slate hover:text-navy"
      >
        ← Back to the story
      </button>
    </div>
  );
}
