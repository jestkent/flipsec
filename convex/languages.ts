import { v } from "convex/values";

// The server half of the language list in src/localization.tsx. Adding a
// language means adding its code here and a dictionary there, and nothing
// else: the schema, the translate action, the cache queries and the speech
// cache all read these two validators rather than spelling out literals.
//
// Widening a v.union of literals is an additive schema change. Rows already
// stored under "es" or "fil" still validate, so no migration is needed.
//
// The literals are written out rather than built with a spread over the map
// below. A spread makes v.union infer `string` instead of the exact union,
// which quietly turns `args.language` into a plain string and breaks the
// lookup in LANGUAGE_NAMES.
export const language = v.union(
  v.literal("es"),
  v.literal("zh"),
  v.literal("hi"),
  v.literal("fil"),
  v.literal("vi"),
  v.literal("ru"),
  v.literal("ja"),
  v.literal("ko"),
  v.literal("pt"),
  v.literal("fr"),
);

// English is not a translation target — there is nothing to translate it
// into — but it is a speech target, because Read aloud works in English too.
export const speechLanguage = v.union(
  v.literal("en"),
  v.literal("es"),
  v.literal("zh"),
  v.literal("hi"),
  v.literal("fil"),
  v.literal("vi"),
  v.literal("ru"),
  v.literal("ja"),
  v.literal("ko"),
  v.literal("pt"),
  v.literal("fr"),
);

// The set of codes as a TYPE. Without this, a parameter named `language`
// annotated `typeof language.type` refers to itself and TypeScript refuses it.
export type LanguageCode = typeof language.type;

// How each language is named to the model. The endonym belongs in the UI;
// the prompt is in English, so the language is named in English here.
export const LANGUAGE_NAMES: Record<typeof language.type, string> = {
  es: "Spanish",
  zh: "Simplified Chinese",
  hi: "Hindi",
  fil: "Filipino (Tagalog)",
  vi: "Vietnamese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  pt: "Brazilian Portuguese",
  fr: "French",
};
