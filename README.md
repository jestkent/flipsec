# FlipSec.ai

**Flip the news. Learn the threat. Find the work.** Three feeds of AI security
- news, learning and work - where every card flips to show you what the front
does not tell you, plus an AI safety guide for the moment you need help.

**Live URL:** https://hallowed-nightingale-322.convex.site

## What it does

Scammers started using AI, and the old advice stopped working. Bad spelling used
to be how you spotted a fake. Now a video call can show a face you know, and a
voice on the phone can sound like family.

FlipSec.ai crawls public sources every six hours, rewrites what it finds in plain
language, and puts it on a card that flips.

- **AI Sec News** — real reports of AI used against people. Flip for the
  lesson: how the trick ran, what gave it away, why it worked on someone
  careful, and a tutor you can ask questions.
- **AI Sec Learn** — free guides to how AI gets attacked and defended. Flip for
  what you will learn, who it is for, and the first thing to do to begin.
- **AI Sec Jobs** — openings where AI and security meet. Flip for what they
  want, whether you would fit, and how to apply.

**Ask FlipSec** is one conversational safety guide in place of separate message
and image checkers. A reader can paste something suspicious, attach an image,
ask about privacy or AI, get recovery steps after a mistake, or discuss a web
app security plan. Follow-up questions stay in the same durable Convex Agent
thread, and a relevant question can lead back to a real story in the live feed.
It never labels an item safe or claims to prove that an image was made by AI.

The home page explains the flip and shows what is in each feed, read live from
the database rather than written into the page.

## Accessibility

FlipSec.ai is designed for keyboard, screen reader, low vision, color vision,
motor and motion-sensitive users. Every function is available without a
pointer. Route changes move focus to the new content, feed tabs support arrow,
Home and End keys, card flips move focus to the visible face, form labels and
errors are announced, and live AI or network states use status regions.

The Accessibility options panel in the main navigation offers larger text,
higher contrast, reduced motion, and color palettes for red-green and
blue-yellow color vision differences, plus a no-color palette. These settings
are saved in the browser. Every news, learning, and jobs card has a visible
Read aloud control on both sides, and each Ask FlipSec answer can be read aloud
or stopped independently. Read aloud uses a natural AI voice, labelled as one
while it plays, and falls back to the browser's own speech service when that is
unavailable. The app
also honors operating-system reduced-motion and increased-contrast settings,
supports forced-colors mode, keeps controls at least 44px tall, does not use
color as the only signal, and allows content to reflow instead of truncating at
large text sizes. These are implementation safeguards aligned with WCAG 2.2 AA;
they are not a claim of third-party certification.

The interface and every card headline read in eleven languages: English,
Spanish, Simplified Chinese, Hindi, Filipino, Vietnamese, Russian, Japanese,
Korean, Brazilian Portuguese and French. Each language ships a full interface
dictionary rather than translated article text over English buttons, and the
menu names every language in its own script. Card headlines and summaries are
translated on demand and cached, so the same card is never translated twice.
The lesson, course guide and job posting behind a flip are still English in
every language — a known gap, stated here rather than left for a reader to
discover. No right-to-left language ships yet, because the layout needs to move
off physical direction classes before Arabic or Urdu would read correctly.

Sign up on any tab and one card from each feed you picked arrives in a single
email each morning. Reply to the news drill in your own words and the reply
comes back graded.

## Who it is for

Anyone who is not a security expert: a grandparent who got a call in a voice they
know, someone staring at a message about money, a parent, a teacher, a student,
someone wondering whether a job in AI is open to them. Every card is written so a
7th grader can read it, not because it is only for kids, but because plain words
work for everyone, and the people losing the most to these scams are usually the
ones the usual advice was never written for.

## Mission and vision

**Mission:** Make AI security understandable and useful for everyone,
especially people without technical training.

**Vision:** A world where anyone can recognize AI-enabled threats, respond
safely, and see a path into AI security.

## Built with

Convex for the backend, the live feeds and the crons, Firecrawl for the crawl,
OpenAI for the summaries, lessons, course and job cards, Ask FlipSec and reply
grading, the Convex Agent component for durable assistant threads, and AgentMail
for the daily email and the replies that come back.

The same four technologies appear in a compact footer strip on every view so a
hackathon judge can understand each integration without adding another block of
cards to the homepage.

The reader can delete an Ask FlipSec conversation from the page. That removes
its Agent thread and the app's browser-to-thread mapping.

## Sources and content

FlipSec.ai publishes original summaries and links to the source. It does not
republish article text, course text or listing text.

- [AI Incident Database](https://incidentdatabase.ai/) — a public record of real
  AI harms, used under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Only their own
  incident description field is read, never their report text.
- [FBI IC3 public service announcements](https://www.ic3.gov/PSA) — US government
  work, public domain.
- [FTC consumer alerts](https://consumer.ftc.gov/consumer-alerts) — US government
  work, public domain.
- [OWASP Gen AI Security Project](https://genai.owasp.org/) — free guides to AI
  security from a nonprofit: the LLM Top 10, agentic security, red teaming and
  incident response. Their robots.txt allows crawling with no crawl-delay.
- **Company job boards** — openings read from each employer's own public
  Greenhouse board, with every card linking back to that employer's own
  posting. Generalist remote boards were tried first and dropped: across about
  340 listings from ten queries, four mentioned both AI and security and all
  four were false positives.

Each source's robots.txt and crawl-delay is honoured. A story only reaches the
news feed if AI was genuinely part of it, if it is a trick a reader could learn
to spot, if it could happen to an ordinary person, and if the subject is fit for
a classroom screen. A guide has to be free and about securing AI rather than
building it. A job only counts when the AI is what is being protected or the AI
is what does the protecting, so a cloud security role at an AI company does not
qualify. Most candidates fail a gate, so the feeds stay small on purpose.

## Privacy and email

FlipSec.ai stores a subscriber email address, the questions readers ask a post,
the answers they give, Ask FlipSec's text conversation, and small usage records
for model calls. An attached image is resized in the browser, sent to OpenAI for
that answer, and not kept in the conversation or the app's own tables. There are
no accounts. A reader on the web is a random id kept in their own browser.

Every daily email carries a working unsubscribe link, signed so that only the
addressee's own link works. Both public HTTP routes require a shared secret and
fail closed without one.

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
npm install @convex-dev/agent ai @ai-sdk/openai

# secrets (never commit these)
npx convex env set OPENAI_API_KEY sk-...
npx convex env set FIRECRAWL_API_KEY fc-...
npx convex env set AGENTMAIL_API_KEY ...
npx convex env set WEBHOOK_SECRET "$(openssl rand -hex 24)"
```

## Licence

MIT, see [LICENSE](LICENSE). That covers the code. Content shown in the app is
summarised from public sources and linked back, never redistributed.
