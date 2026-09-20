// IC3 publishes no social card, so those posts need something to look at.
// One piece of art per tactic, matching the tactic chip colour so the feed
// keeps a single colour system rather than gaining a second one.
const ART: Record<string, { from: string; to: string; glyph: string }> = {
  deepfake: { from: "#ede9fe", to: "#ddd6fe", glyph: "M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 18a7 7 0 0 1 14 0" },
  voice: { from: "#fef3c7", to: "#fde68a", glyph: "M12 3v18M7 7v10M17 7v10M3 10v4M21 10v4" },
  phishing: { from: "#e0f2fe", to: "#bae6fd", glyph: "M3 7h18v12H3zM3 7l9 7 9-7" },
  injection: { from: "#ccfbf1", to: "#99f6e4", glyph: "M8 6 3 12l5 6M16 6l5 6-5 6M13 4l-2 16" },
  other: { from: "#f5f5f5", to: "#e5e5e5", glyph: "M12 3v10M12 17v.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" },
};

export default function TacticArt({
  tactic,
  uid,
}: {
  tactic: string;
  uid: string;
}) {
  const art = ART[tactic] ?? ART.other;
  // Two posts sharing a tactic would otherwise emit the same element id, and
  // the gradient reference could bind to the wrong one.
  const id = `art-${tactic}-${uid.replace(/[^a-zA-Z0-9-]/g, "")}`;

  return (
    <svg
      viewBox="0 0 120 63"
      role="img"
      aria-label={`${tactic} illustration`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={art.from} />
          <stop offset="100%" stopColor={art.to} />
        </linearGradient>
      </defs>
      <rect width="120" height="63" fill={`url(#${id})`} />
      <g
        transform="translate(48 15.5) scale(1.33)"
        fill="none"
        stroke="#1f2937"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={art.glyph} />
      </g>
    </svg>
  );
}
