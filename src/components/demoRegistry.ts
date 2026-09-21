import { createElement, type ComponentType } from "react";
import { useLanguage } from "../localization";
import LocalizedPractice from "./LocalizedPractice";
import type { PracticeTopic } from "../practiceCopy";
import ConfidentWrongDemo from "./ConfidentWrongDemo";
import InjectionDemo from "./InjectionDemo";
import ScamWritingDemo from "./ScamWritingDemo";
import VoiceDemo from "./VoiceDemo";

// The one list of interactive lessons, the same way TABS is the one list of
// feeds. A card back and the Ask FlipSec page both read this, so adding a
// lesson is an entry here plus a component, and nothing else holds a list.
//
// `key` is what an authored card carries in `back.demo`, so it is a database
// value and does not change. The label can.
//
// These are ordered by how likely the reader in front of us is to meet them,
// not by how technically interesting they are. The voice call comes first
// because the person losing the most money to AI right now is answering one.
export type Demo = {
  key: string;
  label: string;
  blurb: string;
  Component: ComponentType;
};

function localized(EnglishDemo: ComponentType, topic: PracticeTopic): ComponentType {
  return function Practice() {
    const { language } = useLanguage();
    return language === "en" ? createElement(EnglishDemo) : createElement(LocalizedPractice, { key: `${language}:${topic}`, topic });
  };
}

export const DEMOS: Demo[] = [
  {
    key: "voice-clone",
    label: "The voice on the phone",
    blurb: "Hear what an AI voice sounds like now, and what to do about it.",
    Component: localized(VoiceDemo, "voice-clone"),
  },
  {
    key: "scam-writing",
    label: "Spot the scam",
    blurb: "Five messages, none with a spelling mistake. Three are scams.",
    Component: localized(ScamWritingDemo, "scam-writing"),
  },
  {
    key: "confident-wrong",
    label: "Confidently wrong",
    blurb: "Three AI answers that sound certain. Pick the invented one.",
    Component: localized(ConfidentWrongDemo, "confident-wrong"),
  },
  {
    key: "prompt-injection",
    label: "Hidden orders",
    blurb: "Watch an email tell your AI assistant what to do.",
    Component: localized(InjectionDemo, "prompt-injection"),
  },
];

export function findDemo(key: string | null): Demo | null {
  if (key === null) return null;
  return DEMOS.find((demo) => demo.key === key) ?? null;
}

// An authored lesson card carries a demo key on its back instead of a course
// guide. `back` is v.any() precisely so a new kind of back needs no schema
// change, which also means the shape has to be checked rather than trusted.
export function demoKey(back: unknown): string | null {
  if (typeof back !== "object" || back === null) return null;
  const value = (back as { demo?: unknown }).demo;
  return typeof value === "string" ? value : null;
}
