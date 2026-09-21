// The "why it works" panel. What the person thought was happening, beside
// what was actually happening. The whole point of a deepfake scam is the gap
// between those two columns, so the panel puts them side by side and lets the
// reader see it rather than be told about it.
const TINT: Record<string, string> = {
  deepfake: "#c94f45",
  voice: "#e2a12b",
  phishing: "#c94f45",
  injection: "#138a8a",
  other: "#667788",
  beginner: "#2f7d5b",
  intermediate: "#138a8a",
  advanced: "#e2a12b",
  hiring: "#138a8a",
};

export default function Illusion({
  pairs,
  tactic,
}: {
  pairs: Array<{ seen: string; real: string }>;
  tactic: string;
}) {
  if (pairs.length === 0) return null;
  const tint = TINT[tactic] ?? TINT.other;

  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 border-b border-line bg-ivory px-4 py-2">
        <p className="text-[11px] font-semibold tracking-wider text-slate uppercase">
          What you saw
        </p>
        <span className="w-4" />
        <p
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: tint }}
        >
          What was real
        </p>
      </div>

      {pairs.slice(0, 3).map((pair, i) => (
        <div
          key={pair.seen}
          className={`grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 px-4 py-3 ${
            i > 0 ? "border-t border-line" : ""
          }`}
        >
          <p className="text-base leading-snug text-slate">{pair.seen}</p>
          <span className="w-4 text-center text-neutral-300" aria-hidden>
            →
          </span>
          <p
            className="text-base leading-snug font-medium"
            style={{ color: tint }}
          >
            {pair.real}
          </p>
        </div>
      ))}
    </div>
  );
}
