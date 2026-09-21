import { useState } from "react";

// The everyday AI harm nobody warns ordinary people about.
//
// Prompt injection and deepfakes get the attention; this is the one that
// quietly costs people money and time every day. An AI states a refund
// window, a helpline number, a rule, a dosage — in the same calm, organised,
// confident tone whether it is right or invented. People act on it.
//
// The trick of this demo is that there is nothing to spot. The reader is
// asked to pick the made-up one and all three are made up, which is the only
// honest way to teach that confidence carries no information. A demo where
// the fake was findable would teach the opposite of the truth.
//
// These are fictional examples. Contact details use non-dialable placeholders
// so the exercise does not rely on recognizing a regional reserved-number range.

type Answer = {
  id: string;
  question: string;
  reply: string;
  truth: string;
};

const ANSWERS: Answer[] = [
  {
    id: "refund",
    question: "How long do I have to return something I bought online?",
    reply:
      "Under the fictional Example Shopping Rule you have 21 calendar days from delivery to request a refund, and the seller must respond within 5 business days. Keep your order confirmation, as sellers can ask for it.",
    truth:
      "The example rule, number of days and response window are invented for this exercise. Check the actual seller policy and applicable local rules instead of trusting an unsourced answer.",
  },
  {
    id: "helpline",
    question: "What number do I call to report a scam text?",
    reply:
      "You can forward the message to the national reporting line on [invented text number], or call their support desk on [invented support number] between 8am and 8pm. Both are free from a mobile.",
    truth:
      "Both contact details are invented placeholders, not numbers to use. In a real answer they might have been a stranger's phone, or a number a scammer had bought precisely because people are sent there.",
  },
  {
    id: "bank",
    question: "Will my bank ever ask for my one-time code?",
    reply:
      "Banks will never ask for your code, except during a verified fraud review, when an agent may read back the last two digits to confirm your identity. This is standard practice.",
    truth:
      "Do not share sign-in or payment codes with someone who contacts you. A claim about a fraud review is not proof. Verify through your usual bank app or a number you already trust.",
  },
];

export default function ConfidentWrongDemo() {
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <p className="text-sm font-semibold tracking-widest text-slate uppercase">
          Try it yourself
        </p>
        <p className="mt-1.5 text-base leading-relaxed text-ink">
          Three fictional answers from an AI assistant. Any of them may be made up. Pick one you would verify before using.
        </p>
      </div>

      {ANSWERS.map((answer) => {
        const picked = guess === answer.id;
        return (
          <div
            key={answer.id}
            className={`rounded-card border p-4 ${picked && !revealed ? "border-navy bg-ivory" : "border-line"}`}
          >
            <p className="text-sm font-semibold tracking-wider text-slate uppercase">
              You asked
            </p>
            <p className="mt-1 text-base leading-relaxed text-navy">{answer.question}</p>

            <p className="mt-3 text-sm font-semibold tracking-wider text-slate uppercase">
              It answered
            </p>
            <p className="mt-1 text-base leading-relaxed text-ink">{answer.reply}</p>

            {!revealed && (
              <button
                type="button"
                onClick={() => setGuess(answer.id)}
                aria-pressed={picked}
                className={`mt-3 min-h-11 rounded-control border px-4 text-base font-semibold ${
                  picked ? "border-navy bg-navy text-white" : "border-line text-navy hover:border-navy-soft"
                }`}
              >
                {picked ? "This is the made-up one" : "Pick this one"}
              </button>
            )}

            {revealed && (
              <div className="mt-3 rounded-control border border-danger/40 bg-[#a63c350d] p-3">
                <p className="text-base font-semibold text-danger">Made up.</p>
                <p className="mt-1 text-base leading-relaxed text-ink">{answer.truth}</p>
              </div>
            )}
          </div>
        );
      })}

      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          disabled={guess === null}
          className="min-h-11 self-start rounded-control bg-sage px-4 text-base font-semibold text-white hover:bg-sage-deep disabled:opacity-40"
        >
          {guess === null ? "Pick one to see the answer" : "Show me"}
        </button>
      )}

      {revealed && (
        <div role="status" className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-base font-semibold text-navy">
            All three were made up.
          </p>
          <p className="text-base leading-relaxed text-ink">
            That was not a trick question, it was the whole lesson. There was
            nothing in the writing to find. An AI produces a wrong answer in
            exactly the same calm, organised, confident voice it uses for a
            right one, because it is finishing your sentence rather than
            checking anything.
          </p>
          <p className="text-base leading-relaxed text-ink">
            This matters most for the things people ask when they are worried:
            a helpline number, a refund rule, whether a message is really from
            the bank. An invented phone number is somebody else&rsquo;s phone,
            or a scammer&rsquo;s.
          </p>
          <p className="text-base leading-relaxed text-ink">
            <strong className="font-semibold text-navy">
              Treat an AI answer as a place to start, never as the source.
            </strong>{" "}
            For a number, a rule or a deadline, go to the official site or the
            card in your wallet and read it there. If the AI cannot tell you
            where it got something, it probably did not get it anywhere.
          </p>
        </div>
      )}
    </div>
  );
}
