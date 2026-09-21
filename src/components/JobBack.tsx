// The back of a jobs card. Same shape as CourseBack, same height rules: no
// h-full, no overflow-y-auto, no mt-auto.
//
// The apply link is the point of the card, and it points at the company's own
// posting on its own board rather than at any aggregator.

import { useLanguage } from "../localization";

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
  const { t } = useLanguage();
  if (!back) {
    return (
      <div className="flex min-h-56 flex-col gap-4 p-6">
        <p className="text-base text-slate">
          {t("notWrittenUp")}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 self-start text-base font-medium text-slate hover:text-navy"
        >
          <span aria-hidden>← </span>{t("backToRole")}
        </button>
      </div>
    );
  }

  const wants = back.whatTheyWant ?? [];
  const applyUrl = back.applyUrl || url;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <p className="text-sm font-semibold tracking-widest text-slate uppercase">
          {t("flipJob")}
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
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage"
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
          <p className="text-sm font-semibold tracking-wider text-slate uppercase">
            {t("howToApply")}
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
        className="inline-flex min-h-11 items-center self-start rounded-control bg-navy px-4 py-2.5 text-base font-medium text-white hover:bg-navy-soft"
      >
        {t("seeFullPosting")} <span aria-hidden>↗</span><span className="sr-only">{t("newTab")}</span>
      </a>

      <button
        type="button"
        onClick={onBack}
        className="min-h-11 self-start pt-1 text-base font-medium text-slate hover:text-navy"
      >
        <span aria-hidden>← </span>{t("backToRole")}
      </button>
    </div>
  );
}
