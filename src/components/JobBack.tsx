// The back of a jobs card. Same shape as CourseBack, same height rules: no
// h-full, no overflow-y-auto, no mt-auto.
//
// The apply link is the point of the card, and it points at the company's own
// posting on its own board rather than at any aggregator.

type Back = {
  company?: string;
  locationChip?: string;
  whatTheyWant?: string[];
  goodFitIf?: string;
  howToApply?: string;
  applyUrl?: string;
};

export default function JobBack({
  back,
  url,
  onBack,
}: {
  back: Back | undefined;
  url: string;
  onBack: () => void;
}) {
  if (!back) {
    return (
      <div className="flex min-h-56 flex-col gap-4 p-6">
        <p className="text-base text-slate">
          This one is still being written up. Check back after the next crawl.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-medium text-slate hover:text-navy"
        >
          ← Back to the role
        </button>
      </div>
    );
  }

  const wants = back.whatTheyWant ?? [];
  const applyUrl = back.applyUrl || url;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <p className="text-xs font-semibold tracking-widest text-slate uppercase">
          What they want
        </p>
        {back.company && (
          <p className="mt-1 text-base font-medium text-navy">
            {back.company}
            {back.locationChip && (
              <span className="font-normal text-slate">
                {" · "}
                {back.locationChip}
              </span>
            )}
          </p>
        )}
      </div>

      {wants.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {wants.map((item) => (
            <li key={item} className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal"
              />
              <span className="text-base leading-snug text-ink">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}

      {back.goodFitIf && (
        <p className="border-l-2 border-navy pl-4 text-base leading-relaxed text-ink">
          {back.goodFitIf}
        </p>
      )}

      {back.howToApply && (
        <div className="rounded-card bg-ivory p-4">
          <p className="text-xs font-semibold tracking-wider text-slate uppercase">
            How to apply
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-navy">
            {back.howToApply}
          </p>
        </div>
      )}

      <a
        href={applyUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="self-start rounded-control bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-soft"
      >
        See the full posting ↗
      </a>

      <button
        type="button"
        onClick={onBack}
        className="self-start pt-1 text-sm font-medium text-slate hover:text-navy"
      >
        ← Back to the role
      </button>
    </div>
  );
}
