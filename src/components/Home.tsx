import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { View } from "./Header";
import { languageInfo, useLanguage } from "../localization";
import { onboardingCopy } from "../onboardingCopy";
import { Button } from "./ui";
import Post from "./Post";
import { readerId } from "../reader";

export default function Home({ onNavigate }: { onNavigate: (view: View, kind?: string) => void }) {
  const { language, t } = useLanguage();
  const copy = onboardingCopy(language);
  const news = useQuery(api.stories.listPublished, { kind: "scam", limit: 30 });
  const guides = useQuery(api.stories.listPublished, { kind: "course", limit: 30 });
  return (
    <div lang={languageInfo(language).htmlLang} className="flex flex-col gap-12 pb-8">
      <section className="pt-10 sm:pt-14">
        <h1 className="max-w-[24ch] text-3xl leading-tight font-semibold tracking-tight text-navy sm:text-4xl">{copy.hero}</h1>
        <p className="mt-4 max-w-[68ch] text-lg leading-relaxed text-ink">{copy.intro}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button onClick={() => onNavigate("feed", "scam")}>{copy.readNow}</Button>
          <Button variant="secondary" onClick={() => onNavigate("tools")}>{t("askAi")}</Button>
        </div>
        <p className="mt-8 border-t border-line pt-5 text-base leading-relaxed text-slate">{copy.loop}</p>
      </section>
      {news?.[0] && <section className="max-w-2xl" aria-label={t("news")}>
        <Post story={news[0]} userId={readerId()} />
      </section>}
      <section className="grid gap-6 sm:grid-cols-2" aria-label={t("read")}>
        {([ ["scam", "news", "newsIntro", news], ["course", "learn", "learnIntro", guides] ] as const).map(([kind, label, intro, items]) => (
          <article key={kind} className="border-t-2 border-line pt-4">
            <h2 className="text-xl font-semibold text-navy">{t(label)}{items ? ` · ${items.length}` : ""}</h2>
            <p className="mt-2 text-base leading-relaxed text-slate">{t(intro)}</p>
            <Button variant="secondary" className="mt-4" onClick={() => onNavigate("feed", kind)}>{t("read")}</Button>
          </article>
        ))}
      </section>
      <aside className="border-t border-line pt-5">
        <h2 className="text-base font-semibold text-navy">{copy.career}</h2>
        <p className="mt-2 max-w-[65ch] text-base text-slate">{copy.jobCaution}</p>
        <button className="mt-2 min-h-11 font-semibold text-sage-deep underline" onClick={() => onNavigate("feed", "job")}>{t("jobs")}</button>
      </aside>
      {language !== "en" && <p className="text-sm leading-relaxed text-slate">{copy.scope}</p>}
    </div>
  );
}
