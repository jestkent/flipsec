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
      <h2 className="text-xs font-semibold tracking-wider text-slate uppercase">
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
        <p className="text-lg leading-snug font-medium text-navy">
          Scammers started using AI, and the old advice stopped working. Bad
          spelling used to be how you spotted a fake. Now a video call can show
          a face you know, and a voice on the phone can sound like family.
        </p>
        <p className="text-base leading-relaxed text-ink">
          FlipSec.ai follows AI security three ways: what is happening to people
          right now, how the attacks and defences actually work, and who is
          paying people to work on it. Everything here is a card, and every card
          flips to show you what the front does not tell you.
        </p>
        <ul className="flex flex-col gap-2 text-base leading-relaxed text-ink">
          <li>
            <span className="font-medium text-navy">AI Sec News</span> —
            real reports of AI used against people. Flip for the lesson: how the
            trick ran, what gave it away, and why it worked on someone careful.
          </li>
          <li>
            <span className="font-medium text-navy">AI Sec Edu</span> —
            free guides to how AI gets attacked and defended. Flip for what you
            will learn and the first thing to do to begin.
          </li>
          <li>
            <span className="font-medium text-navy">AI Sec Jobs</span> —
            openings where AI and security meet. Flip for what they want and how
            to apply.
          </li>
        </ul>
      </Block>

      <Block title="Who it is for">
        <p className="text-base leading-relaxed text-ink">
          Anyone who is not a security expert. A grandparent who got a phone
          call in a voice they know. Someone staring at a message about money
          and not sure. A parent, a teacher, a student, anyone who got
          something strange last week.
        </p>
        <p className="text-base leading-relaxed text-ink">
          And anyone who reads a few of these and starts wondering whether they
          could do this for a living. That is what the third feed is for. You do
          not need permission or a degree to start reading the same guides the
          people in those jobs read.
        </p>
        <p className="text-base leading-relaxed text-ink">
          Every card is written so a 7th grader can read it. That is not
          because this is only for kids. It is because plain words work for
          everyone, and the people losing the most to these scams are usually
          the ones the usual advice was never written for. Advice nobody
          understands protects nobody.
        </p>
      </Block>

      <Block title="Where it all comes from">
        <p className="text-base leading-relaxed text-ink">
          Every card is a short summary written in our own words from something
          published openly, with a link to the original. FlipSec.ai does not
          republish anyone's article, guide or job posting.
        </p>
        <ul className="flex flex-col gap-2 text-base text-ink">
          <li>
            <a
              href="https://incidentdatabase.ai/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-navy underline underline-offset-2"
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
              className="font-medium text-navy underline underline-offset-2"
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
              className="font-medium text-navy underline underline-offset-2"
            >
              FTC consumer alerts
            </a>{" "}
            — US government work, public domain.
          </li>
          <li>
            <a
              href="https://genai.owasp.org/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-navy underline underline-offset-2"
            >
              OWASP Gen AI Security Project
            </a>{" "}
            — free, openly published guides to AI security from a nonprofit.
          </li>
          <li>
            <span className="font-medium text-navy">
              Company job boards
            </span>{" "}
            — openings read from each employer's own public board, with every
            card linking back to that employer's own posting.
          </li>
        </ul>
        <p className="text-base leading-relaxed text-slate">
          A story only reaches the news feed if AI was really part of it, if it
          is a trick a reader could learn to spot, if it could happen to an
          ordinary person, and if a teacher could show it to a class. A guide
          has to be free and has to be about securing AI, not building it. A
          job only counts if the AI is what is being protected, or the AI is
          what does the protecting — a cloud security job at an AI company is
          still just a cloud security job. Most candidates fail one of those,
          and the feeds stay small on purpose.
        </p>
      </Block>

      {/* First person, and only what the builder actually said. No invented
          biography, no employer, no location. */}
      <Block title="Why I built it">
        <p className="text-base leading-relaxed text-ink">
          I teach Internet Safety to 6th through 8th graders. Every year I go
          looking for something to show them about the scams they are actually
          running into, and every year I find the same thing: advice written for
          adults in an office, about tricks from five years ago.
        </p>
        <p className="text-base leading-relaxed text-ink">
          So I wrote this for my students. If a 7th grader would not say the
          word, it does not go on the card. That is the rule the whole thing is
          built on.
        </p>
        <p className="text-base leading-relaxed text-ink">
          It started in a classroom, but it did not stay there. The people
          these scams take the most from are often the ones nobody writes for:
          older people, people who never had a reason to learn any of this.
          The same plain words work for them.
        </p>
        <p className="text-base leading-relaxed text-ink">
          The jobs feed is there for a reason too. Some of my students will
          spend their working lives on this, and none of them know yet that it
          is a job you can have. Now they can see the openings next to the
          stories that made them curious.
        </p>
        <p className="text-sm font-medium text-navy">— JKA</p>
      </Block>

      <Block title="How it is built">
        <p className="text-base leading-relaxed text-ink">
          Firecrawl reads the sources every six hours. OpenAI writes the
          summary, the lesson, the course and job cards and the practice
          question, and marks a reply that arrives by email. AgentMail sends the
          daily email and carries the reply back. Convex runs all of it and
          keeps every feed live, so a new card appears without anyone refreshing
          the page.
        </p>
        <p className="text-base leading-relaxed text-slate">
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
        className="self-start text-sm font-medium text-slate hover:text-navy"
      >
        ← Back to the feed
      </button>
    </div>
  );
}
