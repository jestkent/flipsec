# FlipSec

**Flip the news. Learn the threat.** Three feeds of real AI news, where every
card flips to show you what the front does not tell you.

**Live URL:** https://hallowed-nightingale-322.convex.site

## What it does

Scammers started using AI, and the old advice stopped working. Bad spelling used
to be how you spotted a fake. Now a video call can show a face you know, and a
voice on the phone can sound like family.

FlipSec crawls public sources every six hours, rewrites what it finds in plain
language, and puts it on a card that flips.

- **Scams** — real reports of AI used against people. Flip for the lesson: how
  the trick ran, what gave it away, why it worked on someone careful, and a
  tutor you can ask questions.
- **Learn AI** — free AI courses. Flip for what you will learn, who it is for,
  and the first thing to do to begin.
- **Jobs** — remote AI openings. Flip for what they want, whether you would fit,
  and how to apply.

Sign up on any tab and one card from each feed you picked arrives in a single
email each morning. Reply to the scam drill in your own words and the reply
comes back graded.

## Who it is for

Anyone who is not a security expert: a grandparent who got a call in a voice they
know, someone staring at a message about money, a parent, a teacher, a student,
someone wondering whether a job in AI is open to them. Every card is written so a
7th grader can read it, not because it is only for kids, but because plain words
work for everyone, and the people losing the most to these scams are usually the
ones the usual advice was never written for.

## Built with

Convex for the backend, the live feeds and the crons, Firecrawl for the crawl,
OpenAI for the summaries, lessons, course and job cards and reply grading,
AgentMail for the daily email and the replies that come back.

## Sources and content

FlipSec publishes original summaries and links to the source. It does not
republish article text, course text or listing text.

- [AI Incident Database](https://incidentdatabase.ai/) — a public record of real
  AI harms, used under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Only their own
  incident description field is read, never their report text.
- [FBI IC3 public service announcements](https://www.ic3.gov/PSA) — US government
  work, public domain.
- [FTC consumer alerts](https://consumer.ftc.gov/consumer-alerts) — US government
  work, public domain.
- [Hugging Face](https://huggingface.co/learn) — free, openly published courses.
  Their robots.txt allows crawling with no crawl-delay.
- [Remote OK](https://remoteok.com/) — job listings, read through their public
  JSON feed. Their API terms ask to be named as the source and linked back
  without `nofollow`, and every job card does both.

Each source's robots.txt and crawl-delay is honoured. A story only reaches the
Scams feed if AI was genuinely part of it, if it is a trick a reader could learn
to spot, if it could happen to an ordinary person, and if the subject is fit for
a classroom screen. A course has to be genuinely free and genuinely about AI; a
job has to be genuinely about AI and genuinely remote. Most candidates fail a
gate, so the feeds stay small on purpose.

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
