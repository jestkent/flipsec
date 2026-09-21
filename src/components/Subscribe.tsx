import { useMutation } from "convex/react";
import { useId, useState } from "react";
import { api } from "../../convex/_generated/api";
import { languageInfo, useLanguage } from "../localization";
import { onboardingCopy } from "../onboardingCopy";

export default function Subscribe({ userId, kind = "scam" }: { userId: string; kind?: string }) {
  const subscribe = useMutation(api.subscribers.subscribe);
  const { language, t } = useLanguage();
  const copy = onboardingCopy(language);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [confirmation, setConfirmation] = useState(true);
  const id = useId();
  async function signUp() {
    if (state === "sending") return;
    setState("sending");
    try {
      const result = await subscribe({ email, userId, kinds: [kind] });
      setConfirmation(result.confirm !== false);
      setState("done");
      setEmail("");
    } catch { setState("error"); }
  }
  const lang = languageInfo(language).htmlLang;
  if (state === "done") return (
    <div lang={lang} role="status" className="flex flex-col gap-3 rounded-card border border-line bg-white p-5">
      <p>{confirmation ? copy.confirm : copy.already}</p>
      {confirmation && <p className="text-sm text-slate">{copy.missing}</p>}
      {language !== "en" && <p className="text-sm text-slate">{copy.emailEnglish}</p>}
    </div>
  );
  return (
    <form lang={lang} aria-busy={state === "sending"} className="rounded-card border border-line bg-white p-5" onSubmit={(event) => { event.preventDefault(); void signUp(); }}>
      <h2 className="text-base font-semibold text-navy">{copy.emailTitle}</h2>
      <p className="mt-1 text-base text-slate">{copy.emailLine}</p>
      <label htmlFor={id} className="mt-3 block text-sm font-semibold">{copy.emailLabel}</label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input id={id} type="email" name="email" required autoComplete="email" inputMode="email" maxLength={254}
          value={email} onChange={(event) => { setEmail(event.target.value); if (state === "error") setState("idle"); }}
          aria-invalid={state === "error"} aria-describedby={`${id}-help${state === "error" ? ` ${id}-error` : ""}`}
          placeholder="you@example.com" className="min-h-11 min-w-0 flex-1 rounded-control border border-field px-3 py-2 text-base" />
        <button disabled={state === "sending"} className="min-h-11 rounded-control bg-sage px-4 py-2 text-base font-semibold text-white disabled:opacity-40">{state === "sending" ? copy.sending : copy.signup}</button>
      </div>
      <div id={`${id}-help`} className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-slate">
        <p>{copy.help}</p><p>{copy.missing}</p>
        {language !== "en" && <p>{copy.emailEnglish}</p>}
      </div>
      {state === "error" && <p id={`${id}-error`} role="alert" className="mt-2 text-danger">{t("sendFailed")}</p>}
    </form>
  );
}
