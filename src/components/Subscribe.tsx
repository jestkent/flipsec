import { useMutation } from "convex/react";
import { useState } from "react";
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
      <p className="rounded-card border border-line bg-white px-5 py-4 text-base text-ink">
        You are on the list. {pitch.done}
      </p>
    );
  }

  return (
    <div className="rounded-card border border-line bg-white px-5 py-4">
      <p className="text-base font-medium text-navy">{pitch.title}</p>
      <p className="mt-0.5 text-base text-slate">{pitch.line}</p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void signUp();
          }}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-control border border-line px-3 py-2 text-base outline-none focus:border-sage"
        />
        <button
          type="button"
          onClick={() => void signUp()}
          disabled={state === "sending" || !email.includes("@")}
          className="rounded-control bg-sage px-4 py-2 text-base font-semibold text-white hover:bg-sage-deep disabled:opacity-40"
        >
          {state === "sending" ? "…" : "Sign up"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-sm text-danger">
          That did not go through. Check the address and try again.
        </p>
      )}
    </div>
  );
}
