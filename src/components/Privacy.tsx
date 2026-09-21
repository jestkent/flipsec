// What this app stores, who else sees it, and how to make it stop.
//
// There is no login, so none of this is "your account" — it is a handful of
// rows and a random id in your browser. That makes the honest version short,
// which is the point: a policy nobody reads protects nobody. Same 7th grade
// reading level as the rest of the app, because the people most affected by
// what a site does with their data are usually the ones least served by the
// way these pages are normally written.
//
// Written from the code, not from a template. Every claim below is checkable
// against convex/schema.ts and the functions that write to it, and it must be
// updated when they change.

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold tracking-wider text-slate uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Privacy({ onBack }: { onBack: () => void }) {
  return (
    <article lang="en" className="flex flex-col gap-8 px-5 pb-16">
      {/* This whole view is still written in English while <html lang> carries
    the reader's chosen language, so it declares its own. Without it a
    screen reader reads English prose through the wrong voice (WCAG 2.2
    SC 3.1.2), and a browser's translator cannot see anything to offer to
    translate. Remove lang="en" at the same time as translating it. */}
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-navy sm:text-3xl">
          Privacy
        </h1>
        <p className="text-base leading-relaxed text-ink">
          There are no accounts here, so there is no profile of you to keep.
          This page says what is stored anyway, who else sees it, and how to
          make it stop.
        </p>
      </header>

      <Block title="What is on your device">
        <p className="text-base leading-relaxed text-ink">
          Three things, all kept in your own browser and never sent anywhere on
          their own: a random id so the hourly limits can count, the display
          settings you choose under Accessibility, and the language you pick.
          No cookies. No analytics. No advertising. Nothing that follows you to
          another site.
        </p>
        <p className="text-base leading-relaxed text-ink">
          Clearing your browser data for this site removes all three. The random
          id is not tied to your name, and a new one is made the next time you
          visit.
        </p>
      </Block>

      <Block title="What is stored on the server">
        <ul className="flex flex-col gap-2 text-base leading-relaxed text-ink">
          <li>
            <strong className="font-semibold text-navy">
              Your email address
            </strong>{" "}
            — when you request a subscription, so we can send a confirmation.
            Daily delivery starts only after you confirm.
          </li>
          <li>
            <strong className="font-semibold text-navy">
              Questions you ask a card
            </strong>{" "}
            — the question and the answer, so the same question is not paid for
            twice and so the hourly limit can count.
          </li>
          <li>
            <strong className="font-semibold text-navy">
              Your Ask FlipSec conversation
            </strong>{" "}
            — the text, so follow-up questions make sense. An image you attach
            is sent for that one answer and is <em>not</em> kept.
          </li>
          <li>
            <strong className="font-semibold text-navy">
              Drill answers
            </strong>{" "}
            — which choice you picked, and the words you write if you reply to
            the daily email.
          </li>
          <li>
            <strong className="font-semibold text-navy">
              Counts of AI use
            </strong>{" "}
            — a row saying that a reader id used a feature at a time. No content.
          </li>
          <li>
            <strong className="font-semibold text-navy">Email delivery records</strong>{" "}
            — message identifiers link your replies to the right lesson, and
            delivery status lets failed feedback messages be retried.
          </li>
          <li>
            <strong className="font-semibold text-navy">Read-aloud audio</strong>{" "}
            — generated speech is cached on Convex, including answers you choose
            to read aloud. Deleting a conversation does not delete that audio.
          </li>
        </ul>
      </Block>

      <Block title="Who else sees it">
        <p className="text-base leading-relaxed text-ink">
          Your questions, your conversation and any image you attach go to
          OpenAI to produce the answer. Your email address goes to AgentMail,
          which sends the daily message and receives your replies. The app runs
          on Convex, which stores the rows above. Nothing is sold, and nothing
          is shared with anyone else.
        </p>
        <p className="text-base leading-relaxed text-ink">
          Do not type passwords, one-time codes or account numbers into any box
          on this site. You never need them here, and the ask box says so too.
        </p>
      </Block>

      <Block title="Making it stop">
        <p className="text-base leading-relaxed text-ink">
          Every daily email has an unsubscribe link at the foot, and it works
          without signing in to anything. Ask FlipSec has a Delete conversation
          control that removes the conversation itself, not just your view of
          it. Clearing your browser data removes the random id, the display
          settings and the language.
        </p>
        <p className="text-base leading-relaxed text-ink">
          To request other deletions, use the repository linked in the footer
          to ask the owner for a private contact method. Do not post your email
          address, conversation, or browser reader ID in a public issue.
        </p>
      </Block>

      <Block title="Children">
        <p className="text-base leading-relaxed text-ink">
          The cards are written so a 12 year old can read them, but this is not
          a service for children and it does not knowingly collect anything from
          one. Nothing here asks for an age, a name or a location.
        </p>
      </Block>

      <p>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 text-base font-medium text-slate underline underline-offset-4 hover:text-navy"
        >
          <span aria-hidden>← </span>Back to the feed
        </button>
      </p>
    </article>
  );
}
