import { useId, useState } from "react";

// The app's founding premise, made checkable.
//
// "Bad spelling is how you spot a fake" is the single most repeated piece of
// scam advice, and it is now wrong. This lets a reader discover that rather
// than be told it: five messages, all written in clean English, three of them
// scams. Almost everyone does badly, and doing badly IS the lesson.
//
// The scoring is deliberately not congratulatory. Getting four out of five
// still means guessing wrong about a real person's money once.

type Item = {
  id: string;
  from: string;
  body: string;
  scam: boolean;
  because: string;
};

const ITEMS: Item[] = [
  {
    id: "bank",
    from: "Your bank",
    body: "We noticed a sign-in from a new device in another city. If this was you, no action is needed. If it was not, please review your recent activity using the link below.",
    scam: true,
    because:
      "Reads perfectly, and that is the point. The tell is not the writing, it is that it wants you to arrive at your bank through their link instead of your own app.",
  },
  {
    id: "delivery",
    from: "Courier",
    body: "Your parcel could not be delivered because the address is incomplete. Confirm your details within 48 hours or the item will be returned to the sender.",
    scam: true,
    because:
      "Clean grammar, plausible story, and a deadline. The deadline is there to stop you checking with the courier directly, which is the one thing that would end it.",
  },
  {
    id: "dentist",
    from: "Dental clinic",
    body: "This is a reminder of your appointment on Thursday at 2:15pm with your dentist. Please arrive ten minutes early. Reply CANCEL if you need to reschedule.",
    scam: false,
    because:
      "Legitimate in this fictional scenario, but wording alone cannot prove who sent it. Check your own appointment record if you are unsure.",
  },
  {
    id: "boss",
    from: "Your manager",
    body: "Hi, I'm stuck in back-to-back meetings all afternoon. Could you sort out a supplier payment for me? I'll send the details shortly. Keep it between us until it's processed.",
    scam: true,
    because:
      "No spelling error anywhere. The tells are behavioural: urgency, unavailability so you cannot check, money, and secrecy. Secrecy is the loudest one.",
  },
  {
    id: "library",
    from: "Public library",
    body: "The book you reserved, your chosen title, is now available for collection. We will hold it at the front desk for seven days.",
    scam: false,
    because:
      "Legitimate in this fictional scenario. An ordinary-looking message can still be forged; check your library account independently if you need to act.",
  },
];

export default function ScamWritingDemo() {
  const groupId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState(false);

  const answered = Object.keys(picks).length;
  const right = ITEMS.filter((item) => picks[item.id] === item.scam).length;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <p className="text-sm font-semibold tracking-widest text-slate uppercase">
          Try it yourself
        </p>
        <p className="mt-1.5 text-base leading-relaxed text-ink">
          Five messages. Some are real and some are scams. Mark each one, then
          check.
        </p>
      </div>

      {ITEMS.map((item) => {
        const picked = picks[item.id];
        const correct = checked && picked === item.scam;
        return (
          <fieldset key={item.id} className="rounded-card border border-line p-4">
            <legend className="px-1 text-sm font-semibold tracking-wider text-slate uppercase">
              {item.from}
            </legend>
            <p className="text-base leading-relaxed text-ink">{item.body}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { value: true, label: "Scam" },
                { value: false, label: "Real" },
              ].map(({ value, label }) => {
                const id = `${groupId}-${item.id}-${label}`;
                return (
                  <label
                    key={label}
                    htmlFor={id}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-4 text-base ${
                      picked === value ? "border-navy bg-ivory font-semibold text-navy" : "border-line text-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      id={id}
                      name={`${groupId}-${item.id}`}
                      checked={picked === value}
                      onChange={() => {
                        setPicks((p) => ({ ...p, [item.id]: value }));
                        setChecked(false);
                      }}
                      className="h-5 w-5 accent-sage-deep"
                    />
                    {label}
                  </label>
                );
              })}
            </div>

            {checked && (
              <div className="mt-3">
                {/* The verdict is a word, never only a colour. */}
                <p className={`text-base font-semibold ${correct ? "text-success" : "text-danger"}`}>
                  {correct ? "You got this one right." : "You got this one wrong."}{" "}
                  <span className="font-normal text-ink">
                    It is {item.scam ? "a scam" : "real"}.
                  </span>
                </p>
                <p className="mt-1 text-base leading-relaxed text-ink">{item.because}</p>
              </div>
            )}
          </fieldset>
        );
      })}

      <button
        type="button"
        onClick={() => setChecked(true)}
        disabled={answered < ITEMS.length}
        className="min-h-11 self-start rounded-control bg-sage px-4 text-base font-semibold text-white hover:bg-sage-deep disabled:opacity-40"
      >
        {answered < ITEMS.length ? `Mark all five to check (${answered} of 5)` : "Check my answers"}
      </button>

      {checked && (
        <div role="status" className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-base font-semibold text-navy">
            {right} out of {ITEMS.length}.
          </p>
          <p className="text-base leading-relaxed text-ink">
            Every message above is written in correct English. Not one has a
            spelling mistake, a strange greeting or a clumsy sentence, because
            writing well costs a scammer nothing now. The advice most people
            were given — look for bad spelling — was real advice about a real
            tell, and that tell is gone.
          </p>
          <p className="text-base leading-relaxed text-ink">
            What still works is asking what the message <em>wants</em>. Money,
            a login, secrecy, or speed. The two real ones above want nothing
            from you at all.
          </p>
        </div>
      )}
    </div>
  );
}
