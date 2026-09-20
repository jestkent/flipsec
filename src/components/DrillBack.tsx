import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

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
};

export default function DrillBack({
  drill,
  userId,
  onBack,
}: {
  drill: Drill | null | undefined;
  userId: string;
  onBack: () => void;
}) {
  const submit = useMutation(api.attempts.submitAnswer);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function choose(index: number) {
    if (result !== null) return;
    setPicked(index);
    setResult(await submit({ userId, drillId: drill!._id, choice: index }));
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
    <div className="flex h-full flex-col gap-4 p-6">
      <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
        Your turn
      </p>

      <p className="text-[15px] leading-relaxed whitespace-pre-line text-neutral-900">
        {drill.prompt}
      </p>

      <div className="flex flex-col gap-2">
        {drill.choices.map((choice, i) => {
          const isAnswer = result !== null && i === result.correctIndex;
          const isWrongPick = result !== null && i === picked && !result.correct;

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
                  : isWrongPick
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
        <div className="rounded-xl bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-900">
            {result.correct ? "That's the one." : "Not quite."}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            {result.explanation}
          </p>
        </div>
      )}

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

export type { Drill };
export type Story = Doc<"stories">;
