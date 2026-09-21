import { useMutation } from "convex/react";
import { useId, useState } from "react";
import { api } from "../../convex/_generated/api";

// What the reader is signing up for, per feed. Signing up from a tab asks for
// that tab; signing up from two tabs gets both in one email, not two.
const PITCH: Record<string, { title: string; line: string; done: string }> = {
  scam: {
    title: "Get one drill a day",
    line: "Reply in your own words and I will tell you how you did.",
    done: "One lands in your inbox each morning. Reply however you like and I will tell you how you did.",
  },
  course: {
    title: "Learn AI security, one piece a day",
    line: "One free guide, what it teaches, and where to start.",
    done: "One guide lands in your inbox each morning.",
  },
  job: {
    title: "Get an AI security job each morning",
    line: "One opening, what they want, and how to apply.",
    done: "One opening lands in your inbox each morning.",
  },
};

export default function Subscribe({
  userId,
  kind = "scam",
}: {
  userId: string;
  kind?: string;
}) {
  const subscribe = useMutation(api.subscribers.subscribe);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const emailId = useId();
  const errorId = `${emailId}-error`;

  const pitch = PITCH[kind] ?? PITCH.scam;

  async function signUp() {
    if (!email.includes("@") || state === "sending") return;
    setState("sending");
    try {
      await subscribe({ email, userId, kinds: [kind] });
      setState("done");
      setEmail("");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-card border border-line bg-white px-5 py-4 text-base text-ink">
        You are on the list. {pitch.done}
      </p>
    );
  }

  return (
    <form
      className="rounded-card border border-line bg-white px-5 py-4"
      aria-busy={state === "sending"}
      onSubmit={(event) => { event.preventDefault(); void signUp(); }}
    >
      <p className="text-base font-medium text-navy">{pitch.title}</p>
      <p className="mt-0.5 text-base text-slate">{pitch.line}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={emailId} className="sr-only">Email address</label>
        <input
          id={emailId}
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          aria-invalid={state === "error"}
          aria-describedby={state === "error" ? errorId : undefined}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
          placeholder="you@example.com"
          className="min-h-11 min-w-0 flex-1 rounded-control border border-line px-3 py-2 text-base outline-none focus:border-sage"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="min-h-11 rounded-control bg-sage px-4 py-2 text-base font-semibold text-white hover:bg-sage-deep disabled:opacity-40"
        >
          {state === "sending" ? "Signing up…" : "Sign up"}
        </button>
      </div>
      {state === "error" && (
        <p id={errorId} role="alert" className="mt-2 text-base text-danger">
          That did not go through. Check the address and try again.
        </p>
      )}
    </form>
  );
}
