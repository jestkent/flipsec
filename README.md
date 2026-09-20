# FlipSec

**Flip the news. Learn the threat.** A feed of real AI scam stories where
flipping a post opens a lesson built from that exact story.

**Live URL:** https://hallowed-nightingale-322.convex.site

## What it does

Scammers started using AI, and the old advice stopped working. Bad spelling used
to be how you spotted a fake. Now a video call can show a face you know, and a
voice on the phone can sound like family.

FlipSec crawls public incident reports and government advisories every six hours
and rewrites each one as a short, plain-language post. Flip the post and you get
the lesson: how the trick ran, what gave it away, why it worked on someone
careful, and a tutor you can ask questions. Underneath, optionally, a practice
question built from the same story.

Sign up and one drill arrives by email each morning. Reply in your own words and
the reply comes back graded.

## Who it is for

Anyone who is not a security expert: a grandparent who got a call in a voice they
know, someone staring at a message about money, a parent, a teacher, a student.
Every post is written so a 7th grader can read it, not because it is only for
kids, but because plain words work for everyone, and the people losing the most
to these scams are usually the ones the usual advice was never written for.

## Built with

Convex for the backend, the live feed and the crons, Firecrawl for the crawl,
OpenAI for the summaries, lessons, drills and reply grading, AgentMail for the
daily drill email and the replies that come back.

## Sources and content

FlipSec publishes original summaries and links to the source. It does not
republish article text.

- [AI Incident Database](https://incidentdatabase.ai/) — a public record of real
  AI harms, used under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Only their own
  incident description field is read, never their report text.
- [FBI IC3 public service announcements](https://www.ic3.gov/PSA) — US government
  work, public domain.
- [FTC consumer alerts](https://consumer.ftc.gov/consumer-alerts) — US government
  work, public domain.

Each source's robots.txt and crawl-delay is honoured. A story only reaches the
feed if AI was genuinely part of it, if it is a trick a reader could learn to
spot, if it could happen to an ordinary person, and if the subject is fit for a
classroom screen. Most reports fail one of those, so the feed stays small on
purpose.

## Local setup

```bash
# scaffold
npm create vite@latest flipsec -- --template react-ts
cd flipsec
npm install
npm install convex
npx convex dev

# tailwind
npm install -D tailwindcss @tailwindcss/vite

# integrations
npm install @mendable/firecrawl-js openai

# secrets (never commit these)
npx convex env set OPENAI_API_KEY sk-...
npx convex env set FIRECRAWL_API_KEY fc-...
npx convex env set AGENTMAIL_API_KEY ...
```
