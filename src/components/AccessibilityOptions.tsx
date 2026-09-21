import { useEffect, useState } from "react";
import { useLanguage } from "../localization";

const STORAGE_KEY = "flipsec-accessibility";

type Preferences = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  colorVision: "default" | "red-green" | "blue-yellow" | "no-color";
};

const DEFAULTS: Preferences = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  colorVision: "default",
};

function savedPreferences(): Preferences {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Preferences> | null;
    return saved ? { ...DEFAULTS, ...saved } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function AccessibilityOptions({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState<Preferences>(savedPreferences);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textSize = preferences.largeText ? "large" : "default";
    root.dataset.contrast = preferences.highContrast ? "high" : "default";
    root.dataset.motion = preferences.reduceMotion ? "reduced" : "default";
    root.dataset.colorVision = preferences.colorVision;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // The preferences still apply for this visit when storage is blocked.
    }
  }, [preferences]);

  function toggle(key: "largeText" | "highContrast" | "reduceMotion") {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <details className={compact ? "relative" : "w-full rounded-control border border-line bg-white p-4 sm:w-auto sm:min-w-72"}>
      <summary className={compact ? "min-h-11 cursor-pointer content-center rounded-control px-3 text-base font-semibold text-navy" : "min-h-11 cursor-pointer content-center text-base font-semibold text-navy"}>
        {t("accessibility")}
      </summary>
      <fieldset className={compact ? "absolute right-0 z-40 mt-2 flex w-72 flex-col gap-1 rounded-control border border-line bg-white p-4 shadow-lg" : "mt-3 flex flex-col gap-1 border-t border-line pt-3"}>
        <legend className="sr-only">{t("displayPreferences")}</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
          <input
            type="checkbox"
            checked={preferences.largeText}
            onChange={() => toggle("largeText")}
            className="h-5 w-5 accent-sage-deep"
          />
          {t("largerText")}
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
          <input
            type="checkbox"
            checked={preferences.highContrast}
            onChange={() => toggle("highContrast")}
            className="h-5 w-5 accent-sage-deep"
          />
          {t("higherContrast")}
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
          <input
            type="checkbox"
            checked={preferences.reduceMotion}
            onChange={() => toggle("reduceMotion")}
            className="h-5 w-5 accent-sage-deep"
          />
          {t("reduceMotion")}
        </label>
        <label htmlFor="color-vision-mode" className="mt-2 text-base font-semibold text-navy">
          {t("colorVision")}
        </label>
        <select
          id="color-vision-mode"
          value={preferences.colorVision}
          onChange={(event) => setPreferences((current) => ({
            ...current,
            colorVision: event.target.value as Preferences["colorVision"],
          }))}
          className="min-h-11 rounded-control border border-field bg-white px-3 text-base text-ink"
        >
          <option value="default">{t("standardColors")}</option>
          <option value="red-green">{t("redGreen")}</option>
          <option value="blue-yellow">{t("blueYellow")}</option>
          <option value="no-color">{t("noColor")}</option>
        </select>
        <p className="mt-1 text-sm leading-relaxed text-slate">
          {t("colorHelp")}
        </p>
      </fieldset>
    </details>
  );
}
