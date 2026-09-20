import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export default function Subscribe({ userId }: { userId: string }) {
  const subscribe = useMutation(api.subscribers.subscribe);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  async function signUp() {
    if (!email.includes("@") || state === "sending") return;
    setState("sending");
    try {
      await subscribe({ email, userId });
      setState("done");
      setEmail("");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-600">
        You are on the list. One drill lands in your inbox each morning. Reply to
        it however you like and you will get marked.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <p className="text-sm font-medium text-neutral-900">
        Get one drill a day
      </p>
      <p className="mt-0.5 text-sm text-neutral-500">
        Reply to the email in your own words. You will get marked.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void signUp();
          }}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <button
          type="button"
          onClick={() => void signUp()}
          disabled={state === "sending" || !email.includes("@")}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {state === "sending" ? "…" : "Sign up"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-sm text-rose-600">
          That did not go through. Check the address and try again.
        </p>
      )}
    </div>
  );
}
