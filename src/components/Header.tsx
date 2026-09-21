// The header. Compact, one row on every width, and the same on all four
// views. The feed tabs live below it rather than inside it, so the header
// never has to reflow on a phone.

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
        {/* Home. The supplied lockup already contains the wordmark, so there
            is no text beside it — repeating "FlipSec.ai" next to a logo that
            says it is how a header ends up saying the name twice.

            Both images are sized by height with width:auto, so neither can be
            stretched, and the name lives on the button's aria-label rather
            than on whichever image happens to be visible. */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex shrink-0 items-center rounded-control py-1"
          aria-label="FlipSec.ai, go to the home page"
        >
          {/* The mark alone below 640px, where the full lockup would crowd
              the navigation. */}
          <img
            src="/brand/flipsec-ai-mark.png"
            srcSet="/brand/flipsec-ai-mark.png 1x, /brand/flipsec-ai-mark@2x.png 2x"
            width={36}
            height={36}
            alt=""
            className="h-9 w-9 object-contain sm:hidden"
          />
          <img
            src="/brand/flipsec-ai-logo.png"
            srcSet="/brand/flipsec-ai-logo.png 1x, /brand/flipsec-ai-logo@2x.png 2x"
            width={144}
            height={36}
            alt=""
            className="hidden h-9 w-auto object-contain sm:block"
          />
        </button>

        {/* There was a "Start reading" button here beside a "Feeds" link, and
            both of them went to the same place. A header action has to offer
            something the navigation does not, or it is the same control drawn
            twice and the reader has to work out which one is real. The
            primary call to action lives on the home page, where it belongs.

            "Read" rather than "Feeds": it says what you would do there, and
            the three feeds have their own tabs once you arrive. */}
        <nav aria-label="Main" className="ml-auto flex items-center gap-0.5">
          {link("feed", "Read")}
          {link("about", "About")}
        </nav>
      </div>
    </header>
  );
}
