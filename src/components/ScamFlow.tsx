// The infographic. Three stages of the scam, drawn as a flow so the shape of
// the attack is visible before any of the words are read.
const STAGE = [
  { label: "The setup", glyph: "M4 6h16v10H4zM4 6l8 6 8-6" },
  { label: "The hook", glyph: "M12 3v9m0 0a4 4 0 1 1-4 4M8 6h8" },
  { label: "The loss", glyph: "M12 3v12m0 0-4-4m4 4 4-4M4 19h16" },
];

const TINT: Record<string, string> = {
  deepfake: "#7c3aed",
  voice: "#d97706",
  phishing: "#0284c7",
  injection: "#0d9488",
  other: "#525252",
};

export default function ScamFlow({
  steps,
  tactic,
}: {
  steps: string[];
  tactic: string;
}) {
  if (steps.length === 0) return null;
  const tint = TINT[tactic] ?? TINT.other;

  return (
    <ol className="flex flex-col gap-0">
      {steps.slice(0, 3).map((step, i) => {
        const stage = STAGE[i] ?? STAGE[2];
        const last = i === Math.min(steps.length, 3) - 1;

        return (
          <li key={step} className="flex gap-3">
            {/* Rail: the icon, and the line joining it to the next stage. */}
            <div className="flex w-9 shrink-0 flex-col items-center">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${tint}18` }}
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
                  <path
                    d={stage.glyph}
                    fill="none"
                    stroke={tint}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {!last && (
                <span
                  className="w-px flex-1"
                  style={{ backgroundColor: `${tint}30` }}
                />
              )}
            </div>

            <div className={last ? "pb-0" : "pb-5"}>
              <p
                className="text-[11px] font-semibold tracking-wider uppercase"
                style={{ color: tint }}
              >
                {stage.label}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-neutral-700">
                {step}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
