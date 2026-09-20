// One screen, no backend, no router. What this is, who it is for, where the
// stories come from, and how it is built. The sources block is not optional
// decoration: the AI Incident Database publishes under CC BY-SA, which
// requires attribution, and PLAN.md section 5 asks for the copyright position
// to be stated plainly rather than buried in a README.

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function About({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-8">
      <Block title="What this is">
        <p className="text-lg leading-snug font-medium text-neutral-900">
          Scammers started using AI, and the old advice stopped working. Bad
          spelling used to be how you spotted a fake. Now a video call can show
          a face you know, and a voice on the phone can sound like family.
        </p>
        <p className="text-sm leading-relaxed text-neutral-600">
          FlipSec collects real reports of those scams and rewrites each one so
          anyone can read it. Flip a post and you get the lesson: how the trick
          ran, what gave it away, and why it worked on someone careful.
        </p>
      </Block>

      <Block title="Who it is for">
        <p className="text-sm leading-relaxed text-neutral-600">
          People who are not security experts. Middle school students, their
          parents, their teachers, anyone who got a strange message last week.
          Every post is written so a 7th grader can read it, and that limit is
          the whole point. Advice nobody understands protects nobody.
        </p>
      </Block>

      <Block title="Where the stories come from">
        <p className="text-sm leading-relaxed text-neutral-600">
          Every post is a short summary written from a public report, in our own
          words, with a link to the original. FlipSec does not republish
          anyone's article.
        </p>
        <ul className="flex flex-col gap-2 text-sm text-neutral-600">
          <li>
            <a
              href="https://incidentdatabase.ai/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-neutral-900 underline underline-offset-2"
            >
              AI Incident Database
            </a>{" "}
            — a public record of real AI harms, used under{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              CC BY-SA 4.0
            </a>
            .
          </li>
          <li>
            <a
              href="https://www.ic3.gov/PSA"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-neutral-900 underline underline-offset-2"
            >
              FBI IC3 public service announcements
            </a>{" "}
            — US government work, public domain.
          </li>
          <li>
            <a
              href="https://consumer.ftc.gov/consumer-alerts"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-neutral-900 underline underline-offset-2"
            >
              FTC consumer alerts
            </a>{" "}
            — US government work, public domain.
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-neutral-500">
          A story only reaches the feed if AI was really part of it, if it is a
          trick a reader could learn to spot, if it could happen to an ordinary
          person, and if a teacher could show it to a class. Most reports fail
          one of those, and the feed stays small on purpose.
        </p>
      </Block>

      {/* First person, and only what the builder actually said. No invented
          biography, no employer, no location. */}
      <Block title="Why I built it">
        <p className="text-sm leading-relaxed text-neutral-600">
          I teach Internet Safety to 6th through 8th graders. Every year I go
          looking for something to show them about the scams they are actually
          running into, and every year I find the same thing: advice written for
          adults in an office, about tricks from five years ago.
        </p>
        <p className="text-sm leading-relaxed text-neutral-600">
          So I wrote this for my students. If a 7th grader would not say the
          word, it does not go on the post. That is the rule the whole thing is
          built on.
        </p>
        <p className="text-sm font-medium text-neutral-900">— JKA</p>
      </Block>

      <Block title="How it is built">
        <p className="text-sm leading-relaxed text-neutral-600">
          Firecrawl reads the sources every six hours. OpenAI writes the
          summary, the lesson and the practice question, and marks a reply that
          arrives by email. AgentMail sends that daily drill and carries the
          reply back. Convex runs all of it and keeps the feed live, so a new
          post appears without anyone refreshing the page.
        </p>
        <p className="text-sm leading-relaxed text-neutral-500">
          Built for the Convex All Gas Hackathon. The code is open at{" "}
          <a
            href="https://github.com/jestkent/flipsec"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            github.com/jestkent/flipsec
          </a>
          .
        </p>
      </Block>

      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        ← Back to the feed
      </button>
    </div>
  );
}
