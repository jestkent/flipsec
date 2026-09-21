import { useAction, useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { readerId } from "../reader";
import { savedSession, saveSession } from "../privateSession";
import { useLanguage } from "../localization";
import Post from "./Post";
import ReadAloudButton from "./ReadAloudButton";
import { Badge, Button, Card, ErrorNotice } from "./ui";

const SUGGESTIONS = [
  "Is this message a scam?",
  "What should I do after clicking a bad link?",
  "Explain deepfakes in simple words",
  "Check my web app security plan",
];

async function smallJpeg(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12_000_000) {
    throw new Error("Choose a JPG, PNG, or WebP image smaller than 12 MB.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    for (const width of [960, 720, 560]) {
      const scale = Math.min(1, width / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare this image.");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
      if (dataUrl.length <= 800_000) return dataUrl;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("This image is too detailed to send. Try a smaller crop.");
}

function relatedTactic(text: string) {
  const value = text.toLowerCase();
  if (/deepfake|face swap|fake (image|photo|video)|ai (image|photo|video)/.test(value)) return "deepfake";
  if (/voice|audio|phone call|voicemail/.test(value)) return "voice";
  if (/prompt injection|ignore (all|previous)|ai agent|llm/.test(value)) return "injection";
  if (/phish|email|message|text|link|password|login|bank|scam/.test(value)) return "phishing";
  return null;
}

function answerLine(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index} className="font-semibold text-navy">{part.slice(2, -2)}</strong>
      : part,
  );
}

function AnswerText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-base leading-relaxed">
      {text.split(/\n+/).filter(Boolean).map((line, index) => {
        const clean = line.replace(/^#{1,6}\s+/, "");
        const bullet = /^[-*]\s+/.test(clean);
        return <p key={index}>{bullet ? "• " : ""}{answerLine(clean.replace(/^[-*]\s+/, ""))}</p>;
      })}
    </div>
  );
}

export default function SafetyTools() {
  const { t } = useLanguage();
  const [session, setSession] = useState(savedSession);
  const createSession = useMutation(api.browserSessions.create);
  const [threadId, setThreadId] = useState<string | null>(() => session?.threadId ?? null);
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const ask = useAction(api.assistant.ask);
  const removeConversation = useAction(api.assistant.remove);
  const stories = useQuery(api.stories.listPublished, { kind: "scam", limit: 30 });
  const userId = readerId();
  const messages = useQuery(
    api.assistantMessages.list,
    threadId && session ? { sessionToken: session.token, threadId } : "skip",
  );

  async function selectImage(file: File | undefined) {
    setError(null);
    setImage(null);
    setImageName("");
    if (!file) return;
    try {
      setImage(await smallJpeg(file));
      setImageName(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That image could not be opened.");
    }
  }

  async function send() {
    const submitted = question.trim();
    if (busy || submitted.length < 2) return;
    setBusy(true);
    setError(null);
    setPendingQuestion(submitted);
    setQuestion("");
    try {
      let current = session;
      let currentThread = threadId;
      if (!current || current.expiresAt <= Date.now()) {
        current = await createSession({});
        saveSession(current);
        setSession(current);
        currentThread = null;
        setThreadId(null);
      }
      const result = await ask({
        sessionToken: current.token,
        threadId: currentThread ?? undefined,
        question: submitted,
        imageDataUrl: image ?? undefined,
      });
      setThreadId(result.threadId);
      setLastAnswer(result.answer);
      // Store the credential/reference together so two tabs cannot pair one
      // session's credential with the other session's conversation on reload.
      const updated = { ...current, threadId: result.threadId };
      saveSession(updated);
      setSession(updated);
      setImage(null);
      setImageName("");
    } catch (cause) {
      setQuestion(submitted);
      setError(cause instanceof Error ? cause.message : "Ask FlipSec could not answer. Try again.");
    } finally {
      setPendingQuestion(null);
      setBusy(false);
    }
  }

  async function deleteConversation() {
    if (!threadId || busy) return;
    if (!window.confirm("Delete this conversation and all of its messages?")) return;
    setBusy(true);
    setError(null);
    try {
      await removeConversation({ sessionToken: session?.token, threadId });
      if (session) {
        const cleared = { token: session.token, expiresAt: session.expiresAt };
        saveSession(cleared);
        setSession(cleared);
      }
      setThreadId(null);
      setQuestion("");
      setImage(null);
      setImageName("");
      setLastAnswer("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This conversation could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  const conversationText = `${pendingQuestion ?? ""} ${lastAnswer} ${question}`;
  const tactic = relatedTactic(conversationText);
  const related = tactic && stories ? stories.find((story) => story.tactic === tactic) : undefined;
  const pendingIsStored = Boolean(
    pendingQuestion && messages?.some((message) => message.role === "user" && message.text === pendingQuestion),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wider text-slate uppercase">AI safety guide</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy">Ask FlipSec</h1>
          <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-slate">
            Ask about a suspicious message, an image, scams, privacy, AI, or web app security.
            FlipSec explains the clues and gives you a safer next step.
          </p>
          <p lang="en" className="mt-2 max-w-[65ch] text-sm text-slate">
            Conversations stay available in this browser for seven days. Delete yours when finished,
            especially on a shared device. Older conversations cannot be restored after the privacy upgrade.
          </p>
        </div>
        {threadId && (
          <button type="button" disabled={busy} onClick={() => void deleteConversation()} className="min-h-11 shrink-0 text-base font-semibold text-sage-deep underline underline-offset-2 disabled:opacity-50">
            Delete conversation
          </button>
        )}
      </header>

      {!threadId && !pendingQuestion && (
        <div className="grid gap-2 sm:grid-cols-2" aria-label="Suggested questions">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => { setQuestion(suggestion); questionRef.current?.focus(); }}
              className="min-h-12 rounded-control border border-line bg-white px-4 py-3 text-left text-base font-semibold text-navy hover:border-sage hover:bg-ivory"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {(messages?.length || pendingQuestion) ? (
        <div role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" aria-busy={busy}>
          <ol className="flex flex-col gap-3">
          {messages?.map((message) => (
            <li
              key={message.id}
              className={`max-w-[90%] rounded-control px-4 py-3 sm:max-w-[78%] ${message.role === "user" ? "ml-auto bg-navy text-white" : "mr-auto border border-line bg-white text-ink"}`}
            >
              <p className={`mb-1 text-sm font-semibold uppercase tracking-wide ${message.role === "user" ? "text-white/85" : "text-sage-deep"}`}>
                {message.role === "user" ? "You" : "FlipSec"}
              </p>
              {message.role === "assistant"
                ? <><AnswerText text={message.text} /><div className="mt-2"><ReadAloudButton text={message.text} label={t("readAnswer")} /></div></>
                : <p className="whitespace-pre-wrap text-base leading-relaxed">{message.text}</p>}
            </li>
          ))}
          {pendingQuestion && (
            <>
              {!pendingIsStored && (
                <li className="ml-auto max-w-[90%] rounded-control bg-navy px-4 py-3 text-white sm:max-w-[78%]">
                  <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-white/85">You</p>
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{pendingQuestion}</p>
                </li>
              )}
              <li className="mr-auto rounded-control border border-line bg-white px-4 py-3 text-ink">
                <p className="text-base font-semibold text-sage-deep">FlipSec is thinking…</p>
              </li>
            </>
          )}
          </ol>
        </div>
      ) : null}

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <Card className="p-4 sm:p-5">
        <form onSubmit={(event) => { event.preventDefault(); void send(); }} aria-busy={busy}>
        <label htmlFor="ask-flipsec" className="text-base font-semibold text-navy">What do you want help with?</label>
        <p id="ask-flipsec-help" className="mt-1 text-base leading-relaxed text-slate">
          Remove passwords, codes, account numbers, and private details before sending.
        </p>
        <textarea
          ref={questionRef}
          id="ask-flipsec"
          aria-describedby="ask-flipsec-help ask-flipsec-keys"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void send();
            }
          }}
          maxLength={4000}
          rows={4}
          placeholder="Paste a suspicious message or ask a safety question…"
          className="mt-3 w-full resize-y rounded-control border border-line bg-white p-3 text-base leading-relaxed text-ink"
        />

        {image && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-control bg-ivory p-3">
            <img src={image} alt={`Preview of attached image: ${imageName}`} className="h-16 w-16 rounded-control border border-line object-cover" />
            <div className="min-w-0 flex-1">
              <p className="break-all text-base font-semibold text-navy">{imageName}</p>
              <p className="text-base text-slate">Resized in your browser. Removed after the answer.</p>
            </div>
            <button type="button" onClick={() => { setImage(null); setImageName(""); }} className="min-h-11 text-base font-semibold text-sage-deep underline underline-offset-2">Remove</button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="file-label min-h-11 cursor-pointer rounded-control border border-line bg-ivory px-4 py-2.5 text-base font-semibold text-navy hover:border-sage">
            Attach image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => { void selectImage(event.target.files?.[0]); event.target.value = ""; }}
              className="sr-only"
            />
          </label>
          <Button type="submit" disabled={busy || question.trim().length < 2}>
            {busy ? "Thinking…" : "Ask FlipSec"}
          </Button>
          <p id="ask-flipsec-keys" className="text-base text-slate">Ctrl + Enter sends. Enter starts a new line.</p>
        </div>
        <p className="mt-4 text-base leading-relaxed text-slate">
          FlipSec can spot clues, but cannot prove that something is safe, genuine, or made by AI.
        </p>
        </form>
      </Card>

      {related && (
        <section className="flex flex-col gap-3" aria-label="Related story">
          <div>
            <Badge tone="neutral">From the live feed</Badge>
            <h2 className="mt-2 text-xl font-semibold text-navy">Practice with a related story</h2>
            <p className="mt-1 text-base text-slate">This story shares a topic with your question. It is not evidence about what you submitted.</p>
          </div>
          <Post story={related} userId={userId} />
        </section>
      )}
    </div>
  );
}
