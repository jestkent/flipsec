import { useAction } from "convex/react";
import { useEffect, useId, useRef, useState, type MouseEvent, type RefObject } from "react";
import { api } from "../../convex/_generated/api";
import { languageInfo, useLanguage } from "../localization";
import { readerId } from "../reader";

// Only one voice plays at a time across the whole page. A CustomEvent
// broadcasts who owns it; window.speechSynthesis is naturally single-voice
// already, and the shared Audio element below gives natural-voice playback
// the same property.
const SPEECH_EVENT = "flipsec-speech-change";
let activeSpeechId = "";
let sharedAudio: HTMLAudioElement | null = null;

function stopSharedAudio() {
  if (!sharedAudio) return;
  sharedAudio.pause();
  sharedAudio.currentTime = 0;
  sharedAudio = null;
}

function readableText(target: HTMLElement | null): string {
  if (!target) return "";
  const copy = target.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[data-read-aloud-control], button, input, textarea, select, [aria-hidden='true']")
    .forEach((node) => node.remove());
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

// The browser-voice locale tag comes from the same LANGUAGES table the menu
// is built from, so a new language never needs a second entry here.

// The natural voice is an OpenAI TTS call and has a length cap on the server
// (4,096 characters). Text past that skips straight to the browser voice
// rather than sending a request that would just be rejected.
const MAX_NATURAL_VOICE_CHARS = 4096;

export default function ReadAloudButton({
  text,
  targetRef,
  label,
}: {
  text?: string;
  targetRef?: RefObject<HTMLElement | null>;
  label?: string;
}) {
  const id = useId();
  const { t, language } = useLanguage();
  const speak = useAction(api.localization.speak);

  const ownsSpeech = useRef(false);
  const [browserVoiceSupported] = useState(
    () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window,
  );
  const [speaking, setSpeaking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [natural, setNatural] = useState(false);

  useEffect(() => {
    function sync(event: Event) {
      const activeId = (event as CustomEvent<string>).detail;
      const isMine = activeId === id;
      if (!isMine && ownsSpeech.current) stopSharedAudio();
      ownsSpeech.current = isMine;
      setSpeaking(isMine);
      if (!isMine) setPreparing(false);
    }
    window.addEventListener(SPEECH_EVENT, sync);
    return () => {
      window.removeEventListener(SPEECH_EVENT, sync);
      if (ownsSpeech.current) {
        activeSpeechId = "";
        window.speechSynthesis?.cancel();
        stopSharedAudio();
      }
    };
  }, [id]);

  function announce(activeId: string) {
    activeSpeechId = activeId;
    window.dispatchEvent(new CustomEvent(SPEECH_EVENT, { detail: activeId }));
  }

  function speakWithBrowserVoice(words: string) {
    if (!browserVoiceSupported) {
      announce("");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(words);
    utterance.lang = languageInfo(language).speechLang;
    utterance.rate = 0.95;
    utterance.onend = () => { if (activeSpeechId === id) announce(""); };
    utterance.onerror = () => { if (activeSpeechId === id) announce(""); };
    setNatural(false);
    announce(id);
    window.speechSynthesis.speak(utterance);
  }

  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (speaking) {
      window.speechSynthesis?.cancel();
      stopSharedAudio();
      announce("");
      return;
    }

    const words = (text ?? readableText(targetRef?.current ?? null)).trim();
    if (!words) return;

    // Claim the slot immediately, before either voice has actually started.
    // That is what makes clicking a second button interrupt the first one
    // even while the natural voice is still being generated.
    announce(id);

    if (words.length <= MAX_NATURAL_VOICE_CHARS) {
      setPreparing(true);
      try {
        const result = await speak({ userId: readerId(), text: words, language });
        // Something else claimed speech while this request was in flight.
        if (activeSpeechId !== id) return;
        setPreparing(false);
        setNatural(true);
        const audio = new Audio(result.url);
        sharedAudio = audio;
        audio.onended = () => { if (activeSpeechId === id) announce(""); };
        audio.onerror = () => { if (activeSpeechId === id) speakWithBrowserVoice(words); };
        await audio.play();
        return;
      } catch {
        // Rate limited, offline, or the natural voice failed for some other
        // reason. The browser voice below keeps Read aloud working either way.
      }
      if (activeSpeechId !== id) return;
      setPreparing(false);
    }

    speakWithBrowserVoice(words);
  }

  // Natural voice does not depend on window.speechSynthesis, so the control
  // is only hidden when nothing at all can speak: no natural voice action to
  // fall back from, and no browser voice either. That case does not exist in
  // a browser capable of running this app, so the control always renders.

  return (
    // Every string this control renders comes from the dictionary, so it is
    // always in the reader's language -- including when it sits inside a
    // region marked lang="en", like the latest-story card on the home page.
    // Declaring its own language stops a screen reader reading a Spanish
    // label through an English voice, which is the same SC 3.1.2 fault as
    // the one the lang="en" regions fix, pointing the other way.
    <div lang={languageInfo(language).htmlLang} className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={(event) => void toggle(event)}
        disabled={preparing}
        aria-pressed={speaking}
        data-read-aloud-control
        className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-base font-semibold text-sage-deep hover:bg-ivory hover:text-navy disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 9v6h4l5 4V5L9 9H5Z" strokeLinejoin="round" />
          {speaking
            ? <path d="M18 9v6M21 9v6" strokeLinecap="round" />
            : <path d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10" strokeLinecap="round" />}
        </svg>
        {preparing ? t("preparingVoice") : speaking ? t("stopReading") : (label ?? t("readCard"))}
      </button>
      {/* OpenAI's usage policy for synthetic speech requires disclosure that
          the voice is AI generated. Shown only while that voice is actually
          the one playing, next to the control it belongs to rather than as a
          one-time notice someone could miss. */}
      {speaking && natural && (
        <span role="status" className="pl-2 text-sm text-slate">
          {t("voiceDisclosure")}
        </span>
      )}
    </div>
  );
}
