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
being used against people. Every post flips. On the back is a drill built from
that exact story, then a three-step lesson on how the scam runs, then a box where
you can ask follow-up questions about it.

The drill is always about the post you just read, so the context is already in
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
  schedules another mutation, which schedules drill generation. Each link is
  independently retryable.
- **A cron** re-crawls every six hours.
- **Mutations** are transactions: they record attempts, dedupe stories on URL and
  enforce the rate limit on reader questions.
- **Indexes** on every lookup. Seven of them, no table scans anywhere.
- **Static hosting** serves the React app from the same deployment, at
  `.convex.site`.

**Firecrawl** is the content engine. Without it there is no feed. It runs a
two-stage crawl: scrape the index pages of FBI IC3 and FTC consumer alerts for
article links, then scrape each article for its body text. It also pulls each
article's `og:image` so posts carry the source's own artwork where one exists.
Crawl spacing honours each site's `robots.txt`.

**OpenAI** turns crawled government prose into something a 7th grader reads.
Every story gets one structured call that returns a summary in original phrasing,
the red flags, the tactic, and a judgment on whether AI is genuinely part of the
scam. A second call writes the drill, its three plausible choices, the
explanation and the lesson steps. A third answers reader questions, scoped to the
post in front of them.

**AgentMail** is not built yet. It is the next thing in the queue: send the daily
drill, receive the emailed reply, grade it with OpenAI and write the result back
into the app. The schema and the HTTP route prefix are already in place for it.

## Architecture

```
CRON (6h) -> crawlSources (internalAction, Firecrawl)
               -> saveRawStory (mutation, dedupe on by_url)
                    -> processStory (internalAction, OpenAI)
                         -> saveProcessed (mutation, publish + clear rawText)
                              -> makeDrill (internalAction, OpenAI)
                                   -> saveDrill (mutation)

FEED   -- useQuery(listPublished)  --> live
DRILL  -- useQuery(drillForStory)  --> live, loaded only on flip
```

One rule governs all of it: **actions do network calls and never touch the
database.** They reach it by scheduling mutations. Mutations are transactions and
never fetch. Where a mutation already holds the data an action needs, it passes it
straight in, so no action ever reads a row.

20 Convex functions. Every AI and crawl function is internal and cannot be called
from a browser. The only two public write paths are answering a drill and asking
a question, and both are capped.

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

Primary sources are **public-domain US government advisories** — FBI IC3 public
service announcements and FTC consumer alerts. Both are written for the public,
both are free of copyright, and both are about scams hitting real people this
month. The summarisation prompt explicitly forbids reusing any phrase from the
source. Raw crawled text is deleted from the database the moment a story is
processed, and the feed query strips it again on the way out.

An AI-relatedness test runs inside the same OpenAI call as the summary. Stories
that turn out not to involve AI are marked failed and never reach the feed. The
filter is deliberately strict, which keeps the feed small and on-topic rather
than large and generic.

## Status

- Live at a public URL, no invite needed
- Crawl, AI pipeline, feed, flip, drill, lesson and ask-AI all working end to end
- Currently 26 stories crawled, 4 published, 4 drills, on the production deployment
- Not yet built: AgentMail two-way email, accounts, reactions
