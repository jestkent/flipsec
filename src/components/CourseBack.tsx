// The back of an AI Sec Edu card. Deliberately thinner than LessonBack: it
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
        <p className="text-base text-neutral-500">
          This one is still being written up. Check back after the next crawl.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          ← Back to the guide
        </button>
      </div>
    );
  }

  const learn = back.whatYouLearn ?? [];

  return (
    <div className="flex flex-col gap-5 p-6">
      <p className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
        What you will learn
      </p>

      {learn.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {learn.map((item) => (
            <li key={item} className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              />
              <span className="text-base leading-snug text-neutral-700">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}

      {back.whoItIsFor && (
        <div>
          <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Who it is for
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-neutral-700">
            {back.whoItIsFor}
          </p>
        </div>
      )}

      {back.firstStep && (
        <div className="rounded-xl bg-neutral-50 p-4">
          <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            How to start
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-neutral-900">
            {back.firstStep}
          </p>
          {back.timeCommitment && (
            <p className="mt-2 text-sm text-neutral-600">
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
        className="self-start rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Open the guide ↗
      </a>

      <button
        type="button"
        onClick={onBack}
        className="self-start pt-1 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        ← Back to the guide
      </button>
    </div>
  );
}
