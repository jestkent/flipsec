// The back of an AI Sec Learn card. Deliberately thinner than LessonBack: it
// answers three questions about a guide and then gets out of the way.
//
// No h-full, no overflow-y-auto, no mt-auto anywhere in here. A face is
// absolutely positioned at inset 0, so anything that stretches to the face
// reports the height it was given rather than the height of its content, and
// Post's ResizeObserver then clamps the card and clips the text.

type Back = {
  provider?: string;
  whatYouLearn?: string[];
  whoItIsFor?: string;
  firstStep?: string;
  timeCommitment?: string;
};

export default function CourseBack({
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
          className="min-h-11 self-start text-base font-medium text-slate hover:text-navy"
        >
          ← Back to the guide
        </button>
      </div>
    );
  }

  const learn = back.whatYouLearn ?? [];

  return (
    <div className="flex flex-col gap-5 p-6">
      <p className="text-sm font-semibold tracking-widest text-slate uppercase">
        What you will learn
      </p>

      {learn.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {learn.map((item) => (
            <li key={item} className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage"
              />
              <span className="text-base leading-snug text-ink">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}

      {back.whoItIsFor && (
        <div>
          <p className="text-sm font-semibold tracking-wider text-slate uppercase">
            Who it is for
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-ink">
            {back.whoItIsFor}
          </p>
        </div>
      )}

      {back.firstStep && (
        <div className="rounded-card bg-ivory p-4">
          <p className="text-sm font-semibold tracking-wider text-slate uppercase">
            How to start
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-navy">
            {back.firstStep}
          </p>
          {back.timeCommitment && (
            <p className="mt-2 text-base text-slate">
              Takes {back.timeCommitment}.
            </p>
          )}
        </div>
      )}

      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex min-h-11 items-center self-start rounded-control bg-navy px-4 py-2.5 text-base font-medium text-white hover:bg-navy-soft"
      >
        Open the guide <span aria-hidden>↗</span><span className="sr-only">(opens in a new tab)</span>
      </a>

      <button
        type="button"
        onClick={onBack}
        className="min-h-11 self-start pt-1 text-base font-medium text-slate hover:text-navy"
      >
        ← Back to the guide
      </button>
    </div>
  );
}
