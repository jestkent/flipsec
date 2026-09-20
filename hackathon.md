# FlipSec — Convex All Gas build log

**Flip the news. Learn the threat.**

| | |
|---|---|
| **Live app** | <https://hallowed-nightingale-322.convex.site> |
| **Repo** | <https://github.com/jestkent/flipsec> |
| **Demo video** | _to come_ |
| **Built by** | Jestoni Agan, who teaches Internet Safety to 6th–8th graders |

---

## What it is

A scrolling feed that reads like social media and carries real alerts about AI
being used against people. Every post flips.

On the back is a lesson built from that exact story: a diagram of the three
stages of the scam, a note on why a careful person still falls for it, a button
that writes you a tutor-style explanation with an everyday comparison, and a box
where you can ask it anything about that scam. Underneath, if you want it, a
practice question.

The lesson is always about the post you just read, so the context is already in
your head. No setup, no curriculum, no login wall.

## Who it is for

People who are not security professionals. Middle school students, their parents,
their teachers, anyone who got a weird text last week. Every post is written at a
7th grade reading level, and that constraint is the product, not a nicety. It is
what separates this from every enterprise awareness tool in the category.

Bad grammar used to be how you spotted a scam. It is not anymore. Voice cloning,
deepfaked video calls and personalised phishing are now cheap enough to aim at
ordinary people. Awareness training, meanwhile, is annual, corporate and built
around threats from five years ago.

## The stack, and what each piece actually does

**Convex** runs everything. Not a database behind an API — the whole backend.

- **Reactive queries** drive the feed. `listPublished` subscribes over a
  WebSocket, and when a crawl publishes a story the post appears in every open
  browser with no refresh and no polling.
- **The scheduler** chains the entire content pipeline. A cron fires a crawl, the
  crawl schedules a mutation, that mutation schedules an AI action, which
  schedules another mutation, which schedules lesson generation. A reply that
  arrives by email enters the same way. Each link is independently retryable.
- **Two crons**: re-crawl every six hours, send the daily drill email.
- **Mutations** are transactions: they record attempts, dedupe stories on URL and
  enforce the rate limit on reader questions.
- **Indexes** on every lookup. Seven of them, no table scans anywhere.
- **Static hosting** serves the React app from the same deployment, at
  `.convex.site`.

**Firecrawl** is the content engine. Without it there is no feed. It runs a
two-stage crawl: scrape each source's index for article links, then scrape every article
for its body text. It also pulls each
article's `og:image` so posts carry the source's own artwork where one exists.
Crawl spacing honours each site's `robots.txt`.

**OpenAI** turns crawled government prose into something a 7th grader reads.
Every story gets one structured call that returns a summary in original phrasing,
the red flags, the tactic, and a judgment on whether AI is genuinely part of the
scam. A second call writes the three lesson steps, why the scam works, and a
practice question with three plausible choices. A third writes the tutor lesson
on demand, cached so a story is never taught twice. A third answers reader questions, scoped to the
post in front of them.

**AgentMail** closes the loop, in both directions. A cron sends one drill a day
to every subscriber and records which drill went to whom. The reader replies in
plain English from their own inbox. AgentMail posts that reply to an httpAction,
OpenAI grades the free text against the answer key, and the result is written
back onto the attempt. The reader never has to quote the question or pick a
letter: "the one about having to act fast" marks correct.

Not using the AgentMail SDK. It dynamically imports a payments module this app
does not use, and Convex cannot bundle it, so the REST API is called directly
with fetch. That also keeps the code in Convex's fast default runtime.

## Architecture

```
CRON (6h) -> crawlSources (internalAction, Firecrawl)
               -> saveRawStory (mutation, dedupe on by_url)
                    -> processStory (internalAction, OpenAI)
                         -> saveProcessed (mutation, publish + clear rawText)
                              -> makeDrill (internalAction, OpenAI)
                                   -> saveDrill (mutation)

CRON (daily) -> sendDailyDrill (internalAction, AgentMail)
AgentMail inbound -> POST /api/agentmail-inbound (httpAction)
                      -> saveReply (mutation)
                           -> gradeReply (internalAction, OpenAI)
                                -> saveGrade (mutation)

FEED   -- useQuery(listPublished)  --> live
LESSON -- useQuery(drillForStory)  --> live, loaded only on flip
```

One rule governs all of it: **actions do network calls and never touch the
database.** They reach it by scheduling mutations. Mutations are transactions and
never fetch. Where a mutation already holds the data an action needs, it passes it
straight in, so no action ever reads a row.

41 Convex functions. Every AI and crawl function is internal and cannot be called
from a browser. Public write paths are limited to answering a practice question,
asking about a post, requesting a lesson and subscribing, and they are capped.

## The flip

The signature interaction, and the one place real effort went. A 3D rotation with
perspective on the parent rather than the card, 520ms on an asymmetric easing
curve that leaves fast and settles slow, both faces measured so the container
locks to the taller one and the feed never jumps mid-rotation, and a shadow that
lifts at the midpoint to sell the third dimension. Only `transform` and `opacity`
animate, so it stays on the compositor. Under `prefers-reduced-motion` the faces
cross-fade instead.

## Sources and copyright

FlipSec displays only original summaries and links out for the full story. It
never republishes article text.

Three sources, all openly licensed:

- **AI Incident Database** — a public catalogue of real-world AI harms, CC BY-SA
  4.0. Only the AIID-written incident description is read; their aggregated
  report text is explicitly outside that licence and is never touched.
- **FBI IC3** public service announcements — US government work, public domain.
- **FTC consumer alerts** — public domain, and already close to the reading level
  FlipSec targets.

The summarisation prompt explicitly forbids reusing any phrase from the source.
Raw crawled text is deleted from the database the moment a story is processed,
and the feed query strips it again on the way out. Each source's robots.txt is
honoured, including FTC's ten second crawl delay.

Three gates run inside the same OpenAI call as the summary, so filtering costs
nothing extra. Was AI actually used, or is this just a modern scam. Is it a trick
a reader could learn to see coming, rather than a system failing or an insider
misusing access. And could it land on an ordinary person's own phone: a story
needing the words token, kit, server or admin is written for IT staff, and
FlipSec is not for IT staff. A story has to pass all three.

## Status

- Live at a public URL, no invite needed
- Crawl, AI pipeline, feed, flip, lesson, ask-AI and the two-way email loop all
  working end to end against live services
- The feed is deliberately small. Two gates run inside the one OpenAI call that
  writes each summary: is AI actually part of this, and could this land on a
  12 year old's own phone. Most government advisories fail one or the other, and
  the ones that fail are dropped rather than padded into the feed.
- Not built, and out of scope by choice: accounts, reactions, streaks
