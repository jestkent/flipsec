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
        <p className="text-base text-neutral-500">
          This one is still being written up. Check back after the next crawl.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-medium text-neutral-500 hover:text-neutral-900"
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
        <p className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          What they want
        </p>
        {back.company && (
          <p className="mt-1 text-base font-medium text-neutral-900">
            {back.company}
            {back.locationChip && (
              <span className="font-normal text-neutral-600">
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
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500"
              />
              <span className="text-base leading-snug text-neutral-700">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}

      {back.goodFitIf && (
        <p className="border-l-2 border-neutral-900 pl-4 text-base leading-relaxed text-neutral-700">
          {back.goodFitIf}
        </p>
      )}

      {back.howToApply && (
        <div className="rounded-xl bg-neutral-50 p-4">
          <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            How to apply
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-neutral-900">
            {back.howToApply}
          </p>
        </div>
      )}

      <a
        href={applyUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="self-start rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
      >
        See the full posting ↗
      </a>

      <button
        type="button"
        onClick={onBack}
        className="self-start pt-1 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        ← Back to the role
      </button>
    </div>
  );
}
