import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ScamFlow from "./ScamFlow";

type Drill = {
  _id: Id<"drills">;
  storyId: Id<"stories">;
  prompt: string;
  choices: string[];
  steps: string[];
  whyItWorks: string;
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

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function teachMe() {
    if (teaching || lesson !== null) return;
    setTeaching(true);
    try {
      setLesson((await teach({ storyId })).body);
    } finally {
      setTeaching(false);
    }
  }

  async function sendQuestion() {
    if (question.trim().length < 3 || asking) return;
    setAsking(true);
    setAnswer(null);
    try {
      setAnswer((await ask({ userId, storyId, question })).answer);
      setQuestion("");
    } finally {
      setAsking(false);
    }
  }

  async function choose(index: number) {
    if (result !== null) return;
    setPicked(index);
    setResult(await submit({ userId, drillId: drill!._id, choice: index }));
  }

  if (drill === undefined) {
    return (
      <p className="min-h-56 p-6 text-sm text-neutral-500">Opening the lesson…</p>
    );
  }

  if (drill === null) {
    return (
      <div className="flex min-h-56 flex-col gap-4 p-6">
        <p className="text-sm text-neutral-500">
          No lesson for this one yet. Check back after the next crawl.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          ← Back to the story
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
        How this works
      </p>

      <ScamFlow steps={drill.steps} tactic={tactic} />

      {/* Moved off the front of the post. They read better next to the
          explanation than as a wall of chips above the summary. */}
      {redFlags.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            What gives it away
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {redFlags.map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {drill.whyItWorks && (
        <div className="rounded-xl bg-neutral-50 p-4">
          <p className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            Why it works
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
            {drill.whyItWorks}
          </p>
        </div>
      )}

      {/* The tutor. Generated once per story on the server and kept. */}
      {lesson === null ? (
        <button
          type="button"
          onClick={() => void teachMe()}
          disabled={teaching}
          className="self-start rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {teaching ? "Writing your lesson…" : "Teach me how this works →"}
        </button>
      ) : (
        <div className="flex flex-col gap-3 border-l-2 border-neutral-900 pl-4">
          {lesson.split(/\n\n+/).map((para) => (
            <p key={para} className="text-sm leading-relaxed text-neutral-700">
              {para}
            </p>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-neutral-50 p-3">
        <label
          htmlFor={`ask-${drill._id}`}
          className="text-xs font-medium text-neutral-500"
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
            className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <button
            type="button"
            onClick={() => void sendQuestion()}
            disabled={asking || question.trim().length < 3}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {asking ? "…" : "Ask"}
          </button>
        </div>
        {answer !== null && (
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            {answer}
          </p>
        )}
      </div>

      {/* Practice is offered, never a gate. The lesson is the flip. */}
      <div className="border-t border-neutral-100 pt-4">
        {!practising ? (
          <button
            type="button"
            onClick={() => setPractising(true)}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            Try spotting it yourself →
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-neutral-900">
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
                      "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      isAnswer
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : isWrong
                          ? "border-rose-400 bg-rose-50 text-rose-900"
                          : "border-neutral-200 text-neutral-700 enabled:hover:border-neutral-400",
                    ].join(" ")}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {result !== null && (
              <p className="text-sm leading-relaxed text-neutral-600">
                <span className="font-semibold text-neutral-900">
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
        className="self-start pt-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        ← Back to the story
      </button>
    </div>
  );
}
