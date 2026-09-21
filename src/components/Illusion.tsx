// The "why it works" panel. What the person thought was happening, beside
// what was actually happening. The whole point of a deepfake scam is the gap
// between those two columns, so the panel puts them side by side and lets the
// reader see it rather than be told about it.
export default function Illusion({
  pairs,
}: {
  pairs: Array<{ seen: string; real: string }>;
  tactic: string;
}) {
  if (pairs.length === 0) return null;

  return (
    <dl className="overflow-hidden rounded-card border border-line">
      {pairs.slice(0, 3).map((pair, i) => (
        <div
          key={pair.seen}
          className={`grid gap-3 px-4 py-3 sm:grid-cols-2 sm:gap-6 ${
            i > 0 ? "border-t border-line" : ""
          }`}
        >
          <div>
            <dt className="text-sm font-semibold tracking-wider text-slate uppercase">What you saw</dt>
            <dd className="mt-1 text-base leading-snug text-ink">{pair.seen}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold tracking-wider text-navy uppercase">What was real</dt>
            <dd className="mt-1 text-base leading-snug font-medium text-navy">{pair.real}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
