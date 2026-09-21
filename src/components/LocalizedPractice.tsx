import { useState } from "react";
import { PRACTICE, topics, type PracticeTopic } from "../practiceCopy";
import { languageInfo, useLanguage } from "../localization";


export default function LocalizedPractice({ topic }: { topic: PracticeTopic }) {
  const { language, t } = useLanguage();
  const copy = PRACTICE[language];
  const index = topics.indexOf(topic);
  const [choice, setChoice] = useState<boolean | null>(null);
  return (
    <section lang={languageInfo(language).htmlLang} className="flex flex-col gap-4 p-6">
      <h3 className="text-lg font-semibold text-navy">{copy.title}</h3>
      <p className="text-base leading-relaxed">{copy.scenarios[index]}</p>
      <p className="font-semibold">{copy.question}</p>
      <div className="flex flex-col gap-2">
        {[false, true].map((safe) => <button key={String(safe)} disabled={choice !== null} aria-pressed={choice === safe}
          onClick={() => setChoice(safe)} className="min-h-11 rounded-control border border-line px-4 py-3 text-left text-base disabled:opacity-70">
          {safe ? copy.check : copy.act}
        </button>)}
      </div>
      {choice !== null && <div role="status" className="border-t border-line pt-4">
        <p className="font-semibold">{choice ? t("thatsTheOne") : t("notQuite")}</p>
        <p className="mt-2 leading-relaxed">{copy.lessons[index]}</p>
        <button onClick={() => setChoice(null)} className="mt-3 min-h-11 text-sage-deep underline">{copy.again}</button>
      </div>}
    </section>
  );
}
