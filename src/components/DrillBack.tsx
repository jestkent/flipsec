import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Drill = {
  _id: Id<"drills">;
  storyId: Id<"stories">;
  prompt: string;
  choices: string[];
};

type Result = {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  steps: string[];
};

export default function DrillBack({
  drill,
  storyId,
  userId,
  onBack,
}: {
  drill: Drill | null | undefined;
  storyId: Id<"stories">;
  userId: string;
  onBack: () => void;
}) {
  const submit = useMutation(api.attempts.submitAnswer);
  const ask = useAction(api.questions.askAboutStory);

  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function choose(index: number) {
    if (result !== null) return;
    setPicked(index);
    setResult(await submit({ userId, drillId: drill!._id, choice: index }));
  }

  async function sendQuestion() {
    if (question.trim().length < 3 || asking) return;
    setAsking(true);
    setAnswer(null);
    try {
      const reply = await ask({ userId, storyId, question });
      setAnswer(reply.answer);
      setQuestion("");
    } finally {
      setAsking(false);
    }
  }

  if (drill === undefined) {
    return <p className="p-6 text-sm text-neutral-500">Loading the drill…</p>;
  }

  if (drill === null) {
    return (
      <div className="flex h-full flex-col p-6">
        <p className="text-sm text-neutral-500">
          This one has no drill yet. Check back after the next crawl.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-auto self-start text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          ← Back to the story
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
        {result === null ? "Your turn" : "How this scam works"}
      </p>

      {result === null && (
        <p className="text-[15px] leading-relaxed whitespace-pre-line text-neutral-900">
          {drill.prompt}
        </p>
      )}

      {result === null && (
        <div className="flex flex-col gap-2">
          {drill.choices.map((choice, i) => (
            <button
              key={choice}
              type="button"
              onClick={() => void choose(i)}
              className="rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:border-neutral-400"
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {result !== null && (
        <>
          <div
            className={`rounded-xl p-4 ${
              result.correct ? "bg-emerald-50" : "bg-rose-50"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                result.correct ? "text-emerald-900" : "text-rose-900"
              }`}
            >
              {result.correct ? "That's the one." : "Not quite."}
            </p>
            {!result.correct && picked !== null && (
              <p className="mt-1 text-sm text-rose-800">
                The answer was “{drill.choices[result.correctIndex]}”
              </p>
            )}
            <p className="mt-1 text-sm leading-relaxed text-neutral-700">
              {result.explanation}
            </p>
          </div>

          {/* The lesson. Three steps of the mechanic, generated with the
              drill so it costs nothing extra. */}
          {result.steps.length > 0 && (
            <ol className="flex flex-col gap-3">
              {result.steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-neutral-700">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <div className="rounded-xl bg-neutral-50 p-3">
            <label
              htmlFor={`ask-${drill._id}`}
              className="text-xs font-medium text-neutral-500"
            >
              Still wondering something? Ask about this scam.
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
        </>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-auto self-start pt-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        ← Back to the story
      </button>
    </div>
  );
}
