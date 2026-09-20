// The "why it works" panel. What the person thought was happening, beside
// what was actually happening. The whole point of a deepfake scam is the gap
// between those two columns, so the panel puts them side by side and lets the
// reader see it rather than be told about it.
const TINT: Record<string, string> = {
  deepfake: "#7c3aed",
  voice: "#d97706",
  phishing: "#0284c7",
  injection: "#0d9488",
  other: "#525252",
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
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
        <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
          What you saw
        </p>
        <span className="w-4" />
        <p
          className="text-[10px] font-semibold tracking-wider uppercase"
          style={{ color: tint }}
        >
          What was real
        </p>
      </div>

      {pairs.slice(0, 3).map((pair, i) => (
        <div
          key={pair.seen}
          className={`grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 px-4 py-3 ${
            i > 0 ? "border-t border-neutral-100" : ""
          }`}
        >
          <p className="text-sm leading-snug text-neutral-500">{pair.seen}</p>
          <span className="w-4 text-center text-neutral-300" aria-hidden>
            →
          </span>
          <p
            className="text-sm leading-snug font-medium"
            style={{ color: tint }}
          >
            {pair.real}
          </p>
        </div>
      ))}
    </div>
  );
}
