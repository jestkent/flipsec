// The header. Compact, one row on every width, and the same on all four
// views. The feed tabs live below it rather than inside it, so the header
// never has to reflow on a phone.

import { Button } from "./ui";

export type View = "home" | "feed" | "about";

export default function Header({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  const link = (target: View, label: string) => {
    const active = view === target;
    return (
      <button
        type="button"
        onClick={() => onNavigate(target)}
        aria-current={active ? "page" : undefined}
        className={[
          "min-h-11 rounded-control px-3 text-base transition-colors",
          // Underline, not colour alone, so the current page is legible
          // without relying on hue.
          active
            ? "font-semibold text-navy underline decoration-amber decoration-2 underline-offset-8"
            : "font-medium text-slate hover:text-navy",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ivory/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        {/* Home. The logo is never stretched: fixed square, object-contain,
            and the wordmark sits beside it rather than inside the image. */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex shrink-0 items-center gap-2.5 rounded-control py-1"
          aria-label="FlipSec.ai, go to the home page"
        >
          <img
            src="/brand/flipsec-ai-logo.png"
            srcSet="/brand/flipsec-ai-logo.png 1x, /brand/flipsec-ai-logo@2x.png 2x"
            width={36}
            height={36}
            alt=""
            className="h-9 w-9 rounded-[9px] object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-navy">
            FlipSec<span className="font-normal text-slate">.ai</span>
          </span>
        </button>

        <nav aria-label="Main" className="ml-auto flex items-center gap-0.5">
          {link("feed", "Feeds")}
          {link("about", "About")}
        </nav>

        <Button
          size="sm"
          onClick={() => onNavigate("feed")}
          className="ml-1 hidden sm:inline-flex"
        >
          Start reading
        </Button>
      </div>
    </header>
  );
}
