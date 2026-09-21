# FlipSec

**Flip the news. Learn the threat.**

Current status: [READINESS.md](READINESS.md). The original spec and dated
sections below record earlier designs. Earlier reliability work is committed,
and AUDIT section 5b records production email verification. The newer readiness
follow-up is local and awaits production rollout. USER_TESTING.md separates
planned observation from collected evidence.

An AI security awareness app. The feed looks like social media and carries real stories about AI being used against people. Flip any post and it becomes a drill built from that exact story.

- **Domain:** flipsec.ai
- **Hackathon:** Convex All Gas
- **Deadline:** Tuesday, Sep 22, 2026, 12:00 PM PT
- **Submission:** vibeapps.dev
- **Live URL target:** `https://hallowed-nightingale-322.convex.site`

---

## 1. The problem

AI-driven scams are getting past people who would have spotted the old versions. Grammar mistakes used to be the tell. They are not anymore. Voice cloning, deepfaked video calls, and personalized phishing are now cheap enough to aim at ordinary people, not just companies.

Security awareness training exists, but it is corporate, annual, boring, and built around threats from five years ago. Meanwhile the news about new AI scams sits on security blogs nobody reads.

FlipSec closes the gap between "this happened to someone this week" and "here is how you would spot it."

## 2. The mechanic

A scrolling feed that reads like social media, not like a security bulletin. One story per post. Every post flips.

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│ ◈ FTC Consumer Alerts   2h   │      │  YOUR TURN                   │
│ ─────────────────────────────│      │ ─────────────────────────────│
│                              │      │                              │
│ Grandparents are getting     │ flip │  A text says:                │
│ calls in their grandkid's    │ ───► │  "Mom I lost my phone,       │
│ real voice.                  │      │   this is my new number,     │
│                              │      │   can you send $200?"        │
│ Scammers clone a voice from  │      │                              │
│ a few seconds of video and   │      │  What is the strongest       │
│ call asking for bail money.  │      │  red flag here?              │
│                              │      │                              │
│ ▸ urgency  ▸ new number      │      │  ○ It asks for money         │
│ ▸ unverifiable              │      │  ○ The number changed        │
│                              │      │  ○ You cannot verify who    │
│ ♡ 34   ↻ flip   ↗ source     │      │    is actually texting      │
└──────────────────────────────┘      └──────────────────────────────┘
```

The drill is always about the post you just read, so the context is already in the reader's head. No setup, no curriculum, no login wall to start.

### Why the feed format matters

A bulletin gets read once. A feed gets scrolled. The format is doing real work here: it makes security content sit in the same mental slot as the apps people already open out of habit, and it means the drill arrives when attention is already there.

Feed design notes:

- Single column, one post dominant at a time, thumb-reachable actions
- Source identity at the top of each post like an account handle, with favicon and relative timestamp
- Red flags render as inline chips, not a bulleted list
- New posts slide in at the top as crawls land, live, no refresh
- Infinite scroll, no pagination controls

## 3. Audience

Written for people who are not security professionals. Middle school students, their parents, teachers, anyone who got a weird text last week.

Reading level target: a 7th grader can follow every post. That constraint is a feature, and it is what separates this from every enterprise tool in the category.

## 4. How this maps to the judging criteria

| Criterion | How FlipSec meets it |
|---|---|
| Everyday app, not a developer tool | Aimed at ordinary people who use email and phones. No security background assumed. No CLI, no API, no dev audience. |
| Creativity and usefulness | The flip ties current news to practice. Someone would use this the week an AI scam hits their town. |
| Convex depth | Reactive queries drive the feed, mutations record attempts, the scheduler chains crawl to AI to write, cron triggers crawls, an httpAction receives inbound mail, anonymous browser IDs associate activity; there is no account authentication. |
| Firecrawl doing real work | Firecrawl is the content engine. Without it there is no feed. It crawls advisory sources every 6 hours and that output becomes both the post and the drill. |
| OpenAI doing real work | Turns raw crawled text into plain-language summaries, extracts red flags, generates the drill, and grades free-text replies from email. |
| AgentMail doing real work | Sends the daily drill, receives the user's emailed reply, and that reply is graded and written back into the app. Two-way, not just notifications. |
| Live URL | Deployed to convex.site via static hosting. Public, no invite. |
| Social proof | LinkedIn and X post tagging @convex, @OpenAI, @firecrawl, @agentmail. |
| Video demo | Under 3 minutes, clicking through the real app. |

**The honest weak spot:** AI security awareness is not a brand new category. The differentiator is the audience, the feed format, and the news-to-drill loop. The demo should lead with the flip, not with the subject matter.

## 5. Sources and copyright

Facts are not copyrightable. Expression is. "A voice cloning scam hit families in Ohio" is a fact anyone can restate. The reporter's sentences belong to the reporter. FlipSec stays on the right side of that line by displaying only original summaries and linking out for the full story.

### Primary sources, public domain

Use government consumer-protection and security advisories as the main feed:

- **FTC consumer alerts** - US government works, public domain, already written for ordinary people
- **CISA advisories** - authoritative, public domain
- **FBI IC3 alerts** - scam-specific, public domain

This is not only the safe path, it is the better one. FTC alerts are already at the reading level FlipSec targets, they are about scams hitting real people, and "sourced from government consumer-protection alerts" is a stronger line in the demo than "we scrape news sites."

### Secondary sources

Vendor security blogs that publish RSS. An RSS feed is an invitation to syndicate headline and snippet. Add commercial news outlets later, selectively, after reading their terms.

### Rules the code enforces

1. **Never display `rawText`.** Crawl it, process it, show only the generated summary.
2. **Null out `rawText` once `status` is published.** Smaller database, clearer intent.
3. **Prompt for original phrasing.** The summarization prompt says explicitly: summarize in your own words, do not reuse phrases from the source, 60 words maximum.
4. **Attribute and link every post.** Source name visible, headline links to the original. FlipSec sends traffic to sources, it does not replace them.
5. **Check robots.txt and terms per source** before adding it. Many sites prohibit scraping in their terms regardless of robots.txt.
6. **The drill is the safest asset.** A question generated about a technique is transformative work, not a reproduction.

### README line

State plainly that FlipSec summarizes and links to sources, does not republish article text, and prioritizes public-domain government advisories.

Not legal advice. For a hackathon MVP with attribution and original summaries this is normal territory. If FlipSec becomes a revenue product with commercial news sources, get an actual opinion first.

## 6. Architecture

### Data flow

```
CRON (every 6h)
  |
  +-> crawlSources (internalAction)
         Firecrawl scrape -> raw articles
         |
         +-> saveRawStory (internalMutation)
                dedupe on url, insert status: "raw"
                scheduler.runAfter(0, processStory)
                |
                +-> processStory (internalAction)
                       OpenAI -> summary, redFlags[], tactic
                       |
                       +-> saveProcessed (internalMutation)
                              status: "published", rawText cleared
                              scheduler.runAfter(0, makeDrill)
                              |
                              +-> makeDrill (internalAction)
                                     OpenAI -> prompt, choices, answer
                                     |
                                     +-> saveDrill (internalMutation)

FEED  ---- useQuery(listPublished) ----> live, no polling
DRILL ---- useQuery(drillForStory) ----> live

CRON (daily 7am)
  +-> sendDailyDrill (internalAction) -> AgentMail send

AgentMail inbound webhook
  +-> POST /agentmail-inbound (httpAction)
         +-> saveReply (internalMutation)
                +-> gradeReply (internalAction)
                       OpenAI grades the free-text answer
                       +-> saveGrade (internalMutation)
```

### The rule that governs all of it

Actions do network calls and nothing else. They never touch the database directly. They schedule mutations to write. Mutations are transactions and cannot fetch. Queries only read, and the sync engine reruns them automatically when their inputs change.

Keeping actions small is the documented path to a fast Convex backend, and it makes each step independently retryable.

### Schema

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  stories: defineTable({
    url: v.string(),
    title: v.string(),
    source: v.string(),
    sourceIcon: v.optional(v.string()),
    rawText: v.optional(v.string()),  // cleared after processing
    summary: v.optional(v.string()),
    redFlags: v.optional(v.array(v.string())),
    tactic: v.optional(v.string()),   // phishing | deepfake | voice | injection | other
    status: v.string(),               // raw | published | failed
    publishedAt: v.optional(v.number()),
    crawledAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_url", ["url"])
    .index("by_published", ["status", "publishedAt"]),

  drills: defineTable({
    storyId: v.id("stories"),
    prompt: v.string(),
    choices: v.array(v.string()),
    correct: v.number(),
    explanation: v.string(),
  }).index("by_story", ["storyId"]),

  attempts: defineTable({
    userId: v.string(),
    drillId: v.id("drills"),
    answer: v.string(),
    correct: v.optional(v.boolean()),
    feedback: v.optional(v.string()),
    source: v.string(),               // web | email
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_drill", ["userId", "drillId"]),

  subscribers: defineTable({
    email: v.string(),
    userId: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_email", ["email"]),
});
```

### File layout

```
flipsec/
  convex/
    schema.ts
    crons.ts          crawl every 6h, daily email
    crawl.ts          Firecrawl actions
    stories.ts        queries + mutations
    drills.ts         generation + queries
    attempts.ts       submit + grade
    email.ts          AgentMail send
    http.ts           AgentMail inbound webhook
    auth.config.ts
  src/
    main.tsx
    App.tsx
    components/
      Post.tsx        the flip post
      Feed.tsx        the scroll
      DrillBack.tsx
  hackathon.md        judges read this, maintained by /hackathon
  PLAN.md             this file
  README.md
```

### Stack

React, Vite, TypeScript, Tailwind, Convex, OpenAI, Firecrawl, AgentMail.

**Note on the AI Gateway:** paid-teams-only during this hackathon, so use a direct OpenAI key set as a Convex environment variable. No credits are provided, so budget for tokens. Firecrawl gives 20k credits per participant after Luma registration.

## 7. The flip animation

This is the one place to spend real effort. It is the product's signature and the first thing judges see.

### Technique

A 3D rotation on a container with two absolutely positioned faces:

```css
.post {
  perspective: 1400px;              /* on the parent, not the card */
}

.post-inner {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 520ms cubic-bezier(0.2, 0.75, 0.3, 1);
  will-change: transform;
}

.post-inner.flipped {
  transform: rotateY(180deg);
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.face-back {
  transform: rotateY(180deg);
}
```

### What makes it feel good rather than cheap

- **Perspective on the parent.** Perspective set on the rotating element itself flattens the effect. On the parent, posts nearer the viewport center get a more natural projection.
- **Asymmetric easing.** `cubic-bezier(0.2, 0.75, 0.3, 1)` leaves fast and settles slow. A linear or symmetric ease reads mechanical.
- **520ms.** Under 400ms feels like a glitch, over 700ms feels sluggish. This range reads as weight.
- **Height stability.** Both faces must be measured and the container locked to the taller one, otherwise the feed jumps mid-flip. Measure on mount, set the container height, animate nothing else.
- **`will-change: transform` only during the flip.** Leaving it on permanently costs memory across a long feed.
- **Drop shadow lifts during rotation.** A small shadow increase at the midpoint sells the third dimension more than the rotation alone.

### Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  .post-inner { transition: none; }
}
```

With reduced motion the faces cross-fade instead. The flip is also keyboard reachable, Enter or Space on a focused post, with `aria-expanded` reflecting state.

### Performance

Only transform and opacity animate, so everything stays on the compositor. Do not animate height, top, or margin. On a long feed, only render the flip transform for posts currently in or near the viewport.

## 8. Build timeline

### Sunday

**Hour 1, setup and de-risk**
- Register on Luma (this unlocks the Firecrawl credits)
- Copy the hackathon setup prompt into Claude Code
- Scaffold, `npx convex dev`, schema pushed
- Hit Firecrawl against FTC and CISA and confirm usable text comes back

If a source does not crawl cleanly, swap it now, not tonight.

**Hours 2 to 4, the pipeline**
- `crawlSources` writing real rows to `stories`
- `processStory` producing summary, red flags, tactic
- `makeDrill` producing a drill
- Verify in the Convex dashboard before touching any UI

**Hours 5 to 7, the feed**
- Feed query and post list
- The flip, built properly, per section 7
- Answer submission and result

**Hour 8, deploy**
- Static hosting setup and first deploy
- Confirm the public URL opens in a private window

Getting the URL live Sunday means Monday is polish, not panic.

### Monday

- AgentMail send and inbound webhook
- Reply grading
- Seed enough stories that the feed looks alive
- Record the video, post, submit

**Schedule risk:** if the cutoff is Monday 12:00 PM PT, Monday-after-school work is too late. Verify the exact cutoff on the Luma page before sleeping Sunday. If it is Monday noon, everything above lands Sunday.

## 9. Setup commands

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

## 10. Deployment

```bash
npm install @convex-dev/static-hosting
npx @convex-dev/static-hosting setup
npm run deploy
```

The AgentMail inbound webhook points at `https://<deployment>.convex.site/agentmail-inbound`. Note `.site`, not `.cloud`.

flipsec.ai can be pointed at the deployment after the hackathon. For submission, the convex.site URL is what judges need.

## 11. Submission checklist

- [ ] Registered on Luma
- [ ] Public GitHub repo
- [ ] `hackathon.md` at repo root, current
- [ ] Live convex.site URL, opens without an invite
- [ ] Video under 3 minutes
- [ ] Posted on X or LinkedIn tagging @convex, @OpenAI, @firecrawl, @agentmail
- [ ] Submitted on vibeapps.dev

Run `/hackathon` in Claude Code after each work session so `hackathon.md` stays current. That file is what judges actually read.

## 12. Demo video script

Rewritten 2026-09-21 against the app as it actually is. The earlier version
predated the email loop closing, the eleven languages, hash routing and the
interactive lessons, and one of its beats — filming a crawl running live —
turned out to be impractical. Read section 12a first; several of these shots
fail on camera if the preparation is skipped.

Three minutes, mostly screen. Talk less, click more. Every timing below is a
ceiling, not a target.

**0:00–0:20 — the hook.** Say it over the feed already loading.

> "A grandmother in Georgia lost nearly eight hundred thousand dollars to a
> voice she recognised. Most of us were taught that bad spelling is how you
> spot a fake. That stopped being true."

**0:20–1:05 — the flip, which is the product.** Scroll AI Sec News so it reads
as a feed. Open one card. Flip it with the round badge. Answer the drill
**wrong on purpose** and let the explanation land — getting it wrong is the
lesson, and saying so on camera is worth more than a clean answer.

> "Every card flips. The front is what happened. The back is the part nobody
> tells you, built from that story."

**1:05–1:35 — eleven languages, one click.** Still on the same card, change
the language selector to Español. The headline, the summary, the lesson, the
quiz and every label change together.

> "Not a translate button on a page. The whole card, cached, so nobody waits
> for a model."

Say the honest part: the interactive lessons are still English and the card
says so in the reader's own language.

**1:35–2:20 — the email loop, which is the strongest thing here.** Cut to the
inbox with the drill already delivered. Reply in your own words. The grade
arrives **in the same thread**, seconds later. Then reply again with a real
question — "why do scammers use urgency?" — and Ask FlipSec answers in that
same thread.

> "It grades what you wrote, not a multiple-choice click. And once you have
> answered, the thread is just… open. Ask it anything."

This is the Convex + AgentMail + OpenAI beat, and it is worth more than a
dashboard tour because it is the product working rather than the plumbing
being described.

**2:20–2:40 — built on Convex, shown not narrated.** The dashboard with the
`stories`, `attempts` and `sentDrills` tables, then in a terminal:

```
npx convex run health:status --prod
```

> "Three crawlers on a schedule, and every run records what it actually
> found — because a crawl that quietly stops matching looks exactly like a
> quiet day."

**2:40–2:55 — who it is for.** One honest sentence, no slogan.

> "This is written for the people these scams take the most from. Every card
> reads at a seventh-grade level, every control works from a keyboard, and
> the whole thing is screen-reader labelled — because the person most likely
> to get that phone call is the person the usual advice was never written
> for."

**2:55–3:00 — the URL on screen**, held still long enough to read.

### What to cut first if it runs long

The dashboard beat. The email loop and the flip carry the submission; the
plumbing is in the repo for anyone who wants it.

---

## 12a. Pre-flight for the demo, and what breaks on camera

Every item here cost a working session to learn. None of it is obvious.

**The email loop needs a fresh drill and a warm mailbox.**

1. `pickTodaysDrill` is deterministic, so every test drill sent on one day is
   the SAME drill, and one-graded-answer-per-reader-per-drill silently drops a
   second reply from the same address. Reset first:
   `npx convex run subscribers:forget "{email:'...'}" --prod`, which deletes
   the subscriber and their attempts, then send a new one.
2. Reply to the **newest** drill only. A drill sent before a reset points at a
   subscriber id that no longer exists, and that reply is correctly refused.
3. Use a mailbox that has already received FlipSec mail. SPF, DKIM and DMARC
   are unverified, so a cold inbox may put the first message in spam — on
   camera that reads as a broken product rather than a DNS record nobody has
   bought a domain for yet.
4. A Gmail `+alias` cannot complete the loop. Gmail replies from the bare
   address and the ownership check correctly refuses it. Use a separate
   mailbox.

**The feed.** Check it is 8 / 17 / 10, or whatever the crawls have made it, and
that `health:status` is green, before recording:

```
for k in scam course job; do npx convex run stories:listPublished "{kind:'$k'}" --prod | grep -c '"_id"'; done
```

**Language.** Pick a **crawled** Learn card, not one of the top four. The four
authored lessons are the newest cards in that feed, so they sit at the top, and
their backs are English by design. Card 9 or 13 translates in full.

**Do not film a crawl running.** Crawls are six-hourly and most runs save
nothing, because `saveRawStory` drops everything already seen — one recent run
found 60 items and saved zero. Waiting for a live insert on camera is waiting
for something that usually does not happen. Show `health:status` instead, which
reports what the last run found.

**Reduced motion.** If the recording machine has it on at the OS level, the
flip becomes a cross-fade and the single best visual in the product is gone.
Check before recording.

---

## 13. Social post draft

> Built FlipSec this weekend for the @convex All Gas Hackathon.
>
> AI scams got good. Bad grammar is not the tell anymore.
>
> FlipSec pulls this week's real AI-misuse alerts into a feed, then flips each one into a drill so you practice spotting the thing that actually just happened.
>
> @firecrawl crawls the sources. @OpenAI writes the summary and the drill. @agentmail sends it to your inbox and grades your reply. @convex keeps it all live.
>
> I teach Internet Safety to 6th through 8th graders. Every post is written so my students can read it.
>
> flipsec.convex.site

## 14. Risks

| Risk | Mitigation |
|---|---|
| Deadline is Monday noon PT, not Monday night | Verify tonight. Plan for everything to ship Sunday. |
| Firecrawl returns unusable text from a source | Test in hour 1. Keep three candidate sources. |
| Empty feed during the demo | Seed real crawled stories ahead of recording. Never demo an empty state. |
| Flip animation eats the afternoon | Timebox to 45 minutes. Section 7 is the spec, not a starting point for exploration. |
| OpenAI token cost | Cache aggressively. Process each story once, never regenerate per view. |
| AgentMail webhook not wired in time | Cut to send-only and note it as in progress. Do not let it block the deploy. |
| Scope creep | Anything not in section 15 is out. Write it down and move on. |

## 15. Out of scope for the MVP

Not building this weekend, no matter how tempting:

- Streaks, XP, tiers, leaderboards
- Placement test or adaptive difficulty
- Multiple drill types
- Comments, follows, sharing, or any real social graph
- Teacher or classroom dashboards
- Accounts beyond the minimum needed for progress
- Native mobile

The feed is a **format**, not a social network. Making it look like a feed is an afternoon. Making it behave like one is a quarter.

**One optional stretch, only if everything else is done and deployed:** a single reaction per post with a live count. It is cheap, and a count ticking up across two browser windows is a clean visual proof of Convex reactivity for the video. Use the sharded counter component rather than read-add-write.

## 16. Design direction

One bold move, everything else quiet. The flip is the memorable thing and nothing on the page should compete with it.

Feed is a single column with generous vertical rhythm, one post dominant at a time. Source identity sits at the top of each post the way a handle does, which makes attribution part of the design rather than a legal footnote.

Type: one family, two weights. Headlines large enough to read at arm's length on a phone. Body under 70 characters per line.

Color: restrained. The tactic chip is the only place color carries meaning, one hue per tactic, used nowhere else. Resist making a security app look like a terminal.

Copy: plain verbs, sentence case, no jargon. If a 7th grader would not use the word, it does not go on the post. Empty state says what to do, not that nothing is here.

## 17. After the hackathon

**Weeks 1 to 2.** Point flipsec.ai at the deployment. Add accounts properly. Add a second drill type. Run it with one Internet Safety class and watch where students get confused.

**Weeks 3 to 6.** Wrap for iOS with Expo. The React code carries over, and choosing Clerk for auth now means no auth rewrite later. Submit to the App Store positioned as security awareness education, defensive only, no attack tooling. That framing matters for review.

**Later.** A teacher view for assigning posts to a class, which is what this is actually best at and the reason to keep building after the contest ends.

## 18. Shipped extension: Ask FlipSec

The app now also meets the reader at the moment a suspicious item arrives.
Ask FlipSec replaces separate message and image checkers with one conversation.
It accepts pasted text and a temporary local image, answers broader questions
about scams, recovery, privacy, AI and basic web app security, and keeps
follow-up context in a durable Convex Agent thread. It can connect a question
to a real story already in the feed. This is guidance, not an AI detector: it
never promises that media is real, fake, safe, or AI-generated.

Text questions and answers are saved in the Agent component so the conversation
survives a refresh. Images are resized in the browser, supplied only as
temporary model context, and not saved in the thread. A small rate-limit record
is claimed before every model call. The feature is capped per browser and
across the deployment.
Deleting a conversation removes its Agent component thread and the local access
mapping rather than leaving an unreachable transcript behind.

## 19. Shipped extension: app-wide accessibility

Every view now follows one accessibility contract. SPA navigation announces
the destination, updates the document title and moves focus to main content.
The feed selector is an ARIA tab set with Arrow, Home and End keys. Flipping a
card transfers keyboard focus to the newly visible face while the other face
remains inert and hidden from assistive technology.

Forms have programmatic labels, submit behavior, help and error associations,
busy text, and live result announcements. Quiz outcomes include written labels
instead of depending on green and red. External links announce that they open a
new tab. Decorative graphics stay out of the accessibility tree. Text clamping
was removed so zoom and larger type do not hide content, comparison layouts
stack on narrow screens, and interactive targets remain at least 44px tall.

The main navigation has saved preferences for larger text, higher contrast,
reduced motion and color vision. The CSS also follows operating-system motion and contrast preferences
and supports forced-colors mode. This work targets WCAG 2.2 AA patterns without
claiming a formal accessibility certification.

## 20. Shipped extension: calmer presentation

The reader-facing feeds are named AI Sec News, AI Sec Learn and AI Sec Jobs in
full. The homepage now offers two clear actions, three unboxed pathways, three
plain steps and one latest-story card. The previous technology card grid was
removed because it repeated implementation detail and competed with the flip.

A quiet footer strip now names Firecrawl, OpenAI, Convex and AgentMail and gives
each one a single concrete role. It appears on every view, which gives judges
the integration evidence they need without turning the reader experience into
a sponsor wall. About now carries a concise mission and vision in a semantic
definition list.

## 21. Shipped extension: read aloud and color vision controls

Accessibility options sit in the main navigation so they are discoverable
before a reader reaches the footer. Saved color-vision presets cover red-green,
blue-yellow and no-color use while all states continue to carry text, borders
or icons.

Every visible face of an AI Sec News, AI Sec Learn or AI Sec Jobs card has a
Read aloud / Stop reading control, and every Ask FlipSec answer has the same
control. Speech stops when another item starts, and stops if its content
leaves the page. Semantic screen-reader access remains available regardless of
which voice path plays.

The voice itself is OpenAI's `gpt-4o-mini-tts` first, not the device's own
voice: the owner asked for something less robotic than the built-in reader.
The button shows "Preparing natural voice…" while the clip generates, then an
"AI-generated voice" line while it plays, which OpenAI's usage policy for
synthetic speech requires. Audio is cached in Convex storage per exact text and
language, keyed by a hash, so the same card never pays for the same clip
twice. Text past 4,096 characters, a failed request, or an hourly limit
(`toolChecks`, shared with Ask FlipSec) falls back to the browser's built-in
voice automatically and silently — Read aloud always does something, it just
is not always the nicer voice.

## 22. Shipped extension: translated headlines

The language selector now does more than relabel buttons. Choosing one of the
ten languages beside English sends a card's title and summary to OpenAI once,
in the same call shape already defined for the whole card (title, summary, red
flags, back, drill), and the result is cached in `storyTranslations` keyed by
story and language so it is generated once and read many times.

The list is English, Spanish, Simplified Chinese, Hindi, Filipino, Vietnamese,
Russian, Japanese, Korean, Brazilian Portuguese and French. It was chosen for
who actually gets targeted by the scams this feed reports rather than for
global speaker counts, which is why Vietnamese, Filipino and Korean are on it
ahead of several larger languages. Every language ships a full interface
dictionary, not only translated story text: a half-translated page reads as
broken software, which is worse for trust than staying in English.

It ships without any right-to-left language. Arabic and Urdu both belong on
this list on the merits, and neither is here, because the layout still uses
physical direction classes and would mirror incorrectly. That is deferred
work, not a judgement about those readers.

Two files hold the list: `LANGUAGES` in `src/localization.tsx` and the
validators in `convex/languages.ts`, which the schema, the translate action
and both caches import. Widening a `v.union` of literals is additive, so the
rows written when only Spanish and Filipino existed still validate.

`translateStory` claims a rate-limit slot only when the cache misses. A hit
returns free and unmetered, which matters because switching language on a warm
feed fires one call per visible card. Going from two languages to ten
multiplied the uncached surface by five on a public action that spends money,
which is what made the limit necessary rather than merely tidy.

### What "translated" first meant, and what it means now

The first version of this shipped translating a card's title and summary and
nothing else, and it read as broken. The tabs and the navigation changed
language, the headline changed language, and then the lesson behind the flip
was still English — as was every label around it, because the interface
dictionary only ever covered the header and the accessibility panel.

Two separate causes, and only the second was expensive. The card backs were
already being translated: one cached call returns title, summary, red flags,
the course or job back and the whole drill, and the component was reading two
of those fields and throwing the rest away. Reading them costs nothing. The
labels — the flip prompt, the section headings, the quiz feedback, the ask
form — were hardcoded English in the components and had to be extracted, about
thirty strings across four files.

The lesson worth keeping: partial translation is worse than none. A reader who
picks their language and gets a translated headline over an English lesson
learns that the feature does not work, and there is no way for them to tell
which parts are meant to be English. Ship a card translated or leave it alone.

One correctness constraint falls out of translating the drill. Answers are
graded on the server from the drill id and the index the reader picked, and
the correct index never reaches the browser, so array order is the only thing
holding the quiz together. A reordered `choices` array would mark a correct
answer wrong — a worse failure than an untranslated one, because the reader
would be told they misread a scam they actually spotted. The prompt is
explicit about order, and the component refuses translated choices whose count
does not match, falling back to English.

Only the front of a card translates today: the headline and the one-line
summary on every feed. The lesson, the course guide and the job posting on the
back of a card are still English regardless of language, and that is a known
gap, not a design decision — extending the same cached call to the back is the
natural next step. A card that has not been translated yet, or whose
translation failed, shows the original English with no error surfaced to the
reader; a small "AI translated · View original English" line appears only once
a translation exists, and toggles between the two without a second network
call.

---

## 23. Shipped extension: the pre-production audit

A full audit ran against the live deployment before launch. The findings, the
fixes and the reasoning are in AUDIT.md; this section records the two that
changed how the app thinks, rather than only what it does.

### A shared table is not three independent limits

Three reserve functions each counted every row in `toolChecks`, whatever
wrote it, and each compared that count to its own ceiling. They read like
three limits and behaved like one. A pre-generation run of 210 translations
filled Ask FlipSec's ceiling of 160 and took the assistant offline for every
visitor, while the speech budget read the same rows against 300 and kept
passing.

Nothing was under attack and nothing was misconfigured. The bug was that a
limit counted work it was not limiting. The per-reader caps had it worse: a
reader who translated thirty cards spent their own assistant budget doing it,
so using one feature quietly cost them another.

The lesson generalises past rate limiting. When several features share one
store, the thing that makes them independent has to be written down in the
query, not assumed from the fact that they are different features.

### Consent is not a form field

`subscribe` validated the shape of an email address carefully and then
subscribed it. Anyone could put a stranger on a daily mailing list: unwanted
mail for them, spam complaints against a shared sending domain for us, and
nothing that could be called consent.

The fix is not a better form. Nothing is sent to an address until that
address presses a button in a message we sent it, which moves the decision
from whoever typed into the box to the person who will receive the mail.

Both mail routes now draw a button on GET and act on POST, because Outlook,
Proofpoint and Gmail all fetch links in mail before a human sees them. That
already meant a scanner could unsubscribe a real reader by prefetching their
own link, and would have meant a scanner could do the consenting.

### What stayed open, and why

Security headers cannot be set from the repository: the static hosting
component serves fixed headers, so a CSP belongs in the CDN in front. A CSP
also cannot be verified without a browser, and getting `connect-src` wrong
takes the whole app down, so shipping one blind would have traded a
theoretical risk for a real outage.

URL routing stayed unbuilt at the time of the audit, and section 6 of this
plan and CLAUDE.md both recorded that a router did not earn itself here. That
held for a *router*. What shipped later is smaller: hash routing in
`src/navigation.ts`, which buys deep links, refresh and working Back and
Forward without a routing library or a change to how the app renders.

The half that a hash cannot buy is still open, because a fragment is never
sent to the server: one indexable URL, no per-card search indexing, and
HTTP 200 on unknown paths. The first cost in that list was the one measured
here, and it is the one that did not move.

---

## 24. Researched backlog: widening the crawl

Not built. Researched on 2026-09-21 so the work is ready rather than
speculative, and deliberately not shipped before the submission deadline —
the reasoning for that is at the end and matters more than the list.

Every candidate below was checked the way section 5 requires: fetch
`robots.txt`, read the `User-agent: *` block, confirm the path we would read
is not disallowed, note any crawl-delay, then fetch the index itself and look
at what actually came back. A source is only listed as ready if all of that
passed. Where something could not be established it says so rather than
guessing.

### Ready to add

| Source | Feed | robots.txt | Index fetched | Licence |
| --- | --- | --- | --- | --- |
| Google SAIF | Learn | allows `/`, no delay | 200, 131 KB and 190 KB | Google's, summarise and link |
| NIST AI RMF | Learn | allows path, no delay | 200, 93 KB | US federal, public domain |
| IRS tax scam alerts | News | allows `/newsroom`, no delay | 200, 125 KB | US federal, public domain |
| Scamwatch (AU) | News | allows `/news-alerts`, no delay | 200, 92 KB | **not established, see below** |

**Google SAIF** — `saif.google/secure-ai-framework/components` and
`/controls`. The Secure AI Framework: risks, components and controls for
securing AI systems. This is the one large-AI-company source that genuinely
fits, because it is about defending AI rather than building with it. Expect
`isLearningMaterial` to be the gate that argues: a controls catalogue is
closer to a reference than a lesson, and section 5 already rejects vendor
landscapes for exactly that reason. Read the first crawl before deciding
whether that rejection is right here.

**NIST AI Risk Management Framework** —
`nist.gov/itl/ai-risk-management-framework`. Public domain, so no attribution
constraint beyond our own habit of linking out. Watch `isAISecurity`: the RMF
is about AI *risk*, which is broader than security and includes fairness and
transparency. Some of it belongs on this feed and some does not, and the gate
is the right place to draw that line rather than the crawler.

**IRS tax scam alerts** — `irs.gov/newsroom/tax-scams-consumer-alerts`.
Public domain. AI voice cloning of IRS agents is a real and current tactic, so
the `aiRelated` gate will carry most of the filtering. Expect a low pass rate
and treat that as the gate working, not as a broken source.

**Scamwatch (Australia)** — `scamwatch.gov.au/news-alerts`. Good alert
quality and a useful widening past US-only reporting. **The licence could not
be located**: `/copyright` and `/copyright-statement` both 404 and the
homepage carries no Creative Commons statement. Australian government content
is usually CC BY, but usually is not a licence. Establish the terms before
adding this one.

### Checked and rejected

**MITRE ATLAS** — `atlas.mitre.org`. No `robots.txt` at all, which permits
crawling, and it is probably the single most on-topic AI security resource in
existence for this feed. The index returns 200 and **3.7 KB**: a JavaScript
shell with no content in the HTML. That is the same failure that already
defeated CISA in section 5. Firecrawl can render JavaScript, so this is worth
one timeboxed attempt with `indexAllContent`, but it goes in this column
until that attempt succeeds rather than on the strength of how good a fit it
is.

**FTC press releases and SEC investor alerts** — both return **403 on
`robots.txt` itself**. The rule is to check robots.txt before adding a
source; if it cannot be read, permission cannot be claimed. Skip. Note this
is only the `www.ftc.gov` host — `consumer.ftc.gov`, which the app already
crawls, serves its robots.txt normally and sets `Crawl-delay: 10`.

**FBI press releases** — a genuine conflict rather than a technical block.
`fbi.gov/robots.txt` returns 200 and **allows** `/news/press-releases`, but
the page itself returns **403** to a non-browser agent. Firecrawl drives a
real browser and would likely get through. Whether doing so respects the
operator's intent is a judgement about their wishes, not a question the code
can answer, so it stays here until a person decides.

**OpenAI Academy, Anthropic's learn pages, Microsoft Learn** — all three
allow the relevant paths. They are listed as rejected anyway, because they
mostly teach people to *use* AI rather than to secure it, and
`isAISecurity` exists precisely to refuse that inference. Section 5 records
that the jobs gate needed eleven worked examples before it stopped reasoning
"AI company, therefore AI security". Crawling these would spend budget on
material the gate should, and hopefully would, throw away. Microsoft Learn is
the partial exception: it carries real AI security modules, but they have to
be reached by a specific learning path rather than by pointing at the site.

### What the research actually concluded

Checking these properly changed the answer. Good AI security material is not
published as a blog index. Google SAIF is three long pages with no per-risk
URLs — `risks/index` returns 404 and the site exposes one distinct risk path.
The NIST framework has the same shape. The best fit in existence, MITRE
ATLAS, is a 3.7 KB JavaScript shell. The news sites that permit crawling
mostly do not cover AI, and the ones that do could not be verified: Scamwatch
carries AI in its headlines and its licence could not be located across four
URLs.

So crawling has reached diminishing returns for Learn specifically, and that
is a conclusion from measurement rather than caution. What Learn needed was
not another source but lessons this app writes itself, which is section 25.

### Why none of this shipped before submission

Every source this project has added needed gate tuning *after* its first
crawl, never before. `isFree` over-fired by reading Hugging Face's PRO and
Enterprise navigation. `isAISecurity` passed cloud and DevOps roles until it
was given labelled examples. `isScam` tagged a product liability lawsuit as
phishing. In each case the fault was invisible until real cards from that
source were read one by one.

A gate cannot be tuned against material nobody has looked at. Adding sources
shortly before a deadline means either shipping untuned cards into a feed
that is about to be read by judges, or spending the remaining hours on
crawler tuning instead of on the submission. Six, eleven and ten cards that
have each survived a gate is a better feed than thirty where four are wrong,
because on a security feed a wrong card is worse than a missing one.

### How to add one when the time comes

1. Confirm `robots.txt` and the licence again; both change.
2. Add the source and run the crawl **on dev**, never prod.
3. Read every card it produced. All of them, not a sample.
4. Tune the gate that misfired by narrowing what it is asked about if it
   over-fires, or by giving it labelled examples from the material that
   fooled it if it under-fires. Section 5 has the reasoning; do not soften
   the rule itself.
5. Only then promote, and check the three feed counts before and after.

---

## 25. Shipped extension: lessons the app writes itself

AI Sec Learn was a feed of links to other people's guides. It now also
carries lessons written here, and the first one lets a reader run a prompt
injection and watch an assistant obey an email instead of them.

This came out of asking why the crawl could not be widened. The honest answer
was that it could not be widened much: the material worth teaching is
published as frameworks and JavaScript applications rather than as article
indexes, and section 24 has the measurements. A feed that can only link out is
limited by what other people have chosen to publish in a shape a crawler can
read.

An authored card removes every constraint that shaped the rest of the app.
There is no robots.txt to honour, no crawl-delay, no licence to establish, no
gate to tune, and none of section 5's copyright rules bind it, because there
is nothing to attribute. The words are ours. What remains is the harder part:
nothing checks the card but the person who wrote it.

### The four lessons, and why these four

Chosen for the reader this app is actually written for, not for how
interesting the attack is. Ordered by how likely that reader is to meet it.

**The voice on the phone.** The grandparent who gets a call in a voice they
know is the person losing the most to AI right now, so it comes first. It
demonstrates without cloning anyone: the same generic voice the app already
uses for Read aloud, saying what a scammer would say. The lesson is not "we
can copy your daughter", it is "a voice is no longer proof of who is
calling", followed by the two things that still work — hang up and call back
on a number you already have, and agree a family word before anything is
wrong.

**Spot the scam.** Five messages in clean English, three of them scams. This
is the app's founding premise made checkable: bad spelling was real advice
about a real tell, and that tell is gone because writing well now costs a
scammer nothing. Most people score badly, and scoring badly is the lesson.
The two genuine messages ask for nothing, which is the replacement heuristic.

**Confidently wrong.** The everyday harm nobody warns ordinary people about.
A reader is asked to pick the invented answer out of three, and all three are
invented — the only honest way to teach that confidence carries no
information. A demo where the fake was findable would teach the opposite of
the truth. It matters most for what people ask when they are worried: a
helpline number, a refund rule, whether a message is really from the bank. An
invented phone number is somebody else's phone, or a scammer's.

**Hidden orders.** Prompt injection, kept last because it is the one a reader
is least likely to meet personally and the most likely to interest a judge.

### Why the assistant in the demo is scripted

Calling a real model would have been more impressive for about a minute and
worse afterwards. The lesson would depend on the model's mood, it would cost
a call and share an hourly budget with Ask FlipSec, it would fail offline, and
a free-text box that sends whatever a reader types to a model is a box that
can be steered somewhere this app should not go.

The behaviour being demonstrated is real. The demonstration is fixed, the way
a flight simulator is, and the interface says so rather than letting a reader
believe they are talking to something live.

### The line on voice and face

The same request asked for voice changer and face changer lessons. Those ship
as demonstrations or not at all. A reader can experience prompt injection
because nothing they do leaves the page; a working voice cloner is a tool that
does, and on an app teaching people to recognise impersonation, shipping
impersonation tools would be indefensible.

The voice lesson, when it lands, does not need to clone anybody. This app
already generates speech and already labels it, so the demonstration is
pressing play and being told how little that cost.

---

## 26. Shipped fix: translate on write, not on read

The feed had cards translated and cards not translated, in the same list, and
a reader had no way to tell which. Measured rather than guessed: six of eight
news cards had Japanese and two did not, and all four authored lesson cards
had none.

Nothing was broken. Translation happened lazily, on the first reader who
asked for a language, and the only reason the feed ever looked complete was a
one-off warm-up run. Every card published after it — by the six-hourly cron,
or by seeding a lesson — was English until somebody sat through a model call
to fill it in. Worse, that reader is the one who pays the latency and the one
who can hit the hourly cap.

The fix is to move the work to the write. `translateAllLanguages` is
scheduled from every point a story becomes published, so complete cards are translated in the background. English remains visible
while translation runs; the news path now starts after saveDrill. The lazy path stays as a fallback for a
story published before this existed or a language whose turn failed.

The economics are the argument. Publishing is rare and bounded: a handful of
cards per crawl, ten small calls each. Readers are neither bounded nor rare,
and making the first one in each language pay for everybody is the wrong way
round. This is the same reasoning as generating a lesson once per story
rather than per view, which section 14 already settled for a different feature.

Two supporting pieces, both safe to re-run because a language that already has
a row is skipped by the cache check: `localizationData.untranslated` answers
"is the feed actually fully translated" without reading every card by hand,
and `backfillTranslations` schedules the catch-up, staggered, because 250
model calls inside one action would run past the time an action is given.

After the backfill: 35 published stories, ten languages, zero gaps.

---

## 27. Shipped fix: the email loop was open at the far end

Every daily drill ends with "just hit reply and tell me which one, in your own
words. I will tell you how you did." Replies arrived. The webhook verified the
signature, the model graded the answer, `saveGrade` wrote the verdict to the
attempt — and nothing was ever sent back. There were graded rows in the
database that no human had seen.

Every other gap found in this project was a missing feature. This one was
different in kind: the product told a reader something would happen and then
did not. A reader who replied learned that writing in achieves nothing, which
is worse than never having invited them.

It was also the sponsor integration stopping one function short. AgentMail
went send, receive, verify, grade — and halted. It now closes: send, receive,
verify, grade, reply.

### Closing it turned a tidy rule into a safety one

`submitAnswer` on the web has always allowed one attempt per reader per drill.
`saveReply` on the email side did not; it inserted unconditionally, which was
harmless while nothing was ever sent back.

The moment the grade goes out, it is not harmless. Our reply lands in their
inbox. An out-of-office, or any auto-responder, answers it. That answer
arrives here as a new reply, is graded, and is answered again — a mail loop
that spends an OpenAI call on every turn and fills a stranger's inbox.

The guard was already built: the `by_user_drill` index existed, and the rule
existed on the other half of the same feature. It needed applying, not
inventing. That is worth noticing on its own — a consistency gap between two
paths through one feature sat harmless for as long as one path was
incomplete, and became a real fault the moment the feature was finished.

The original sendGrade implementation logged failures without retrying.
The reliability update now commits the grade before scheduling delivery and
uses bounded retries with a stable provider idempotency key.

### How it was tested

End to end against production, on an address in the reserved `.invalid` TLD
so no real mailbox was touched: a subscriber created, a drill marked as sent,
a first reply graded correct with real feedback and a send attempted, a second
reply refused with exactly one attempt row on file, and an unknown address
still failing closed. Test subscriber removed afterwards.

---

## 28. Shipped fix: the translator ate an identifier

Reported as "it does not translate the whole thing", which turned out to be
two faults with nothing in common except where they showed up.

### An identifier is not prose

`back.demo` holds the key of an interactive lesson — `prompt-injection`,
`voice-clone` — and `demoRegistry` matches it exactly. `storySource` sent the
whole `back` object to the translator, so the key went with it, and the model
did what it was asked:

| Card | English | Spanish | Chinese | French |
| --- | --- | --- | --- | --- |
| Hidden orders | `prompt-injection` | `inserción-de-prompt` | `提示注入` | `injection-de-prompt` |
| Confidently wrong | `confident-wrong` | `seguro-equivocado` | `自信-错误` | `confiant-faux` |

`findDemo` then matched nothing and the card fell through to `CourseBack` —
which is the designed fallback for an unrecognised key, and exactly the wrong
outcome here, because an authored back carries a demo key and **nothing else**.
No `whatYouLearn`, no `whoItIsFor`, no `firstStep`. The reader got an eyebrow
heading, an "Open guide" button and a back link. All four interactive lessons,
in all ten non-English languages, since the day they shipped.

Nothing reported it because nothing could. The fallback is silent by design,
the English feed was perfect, and `untranslated` returned `[]` for every
language — the rows existed and were complete. They were complete and wrong,
which no count can see.

Fixed on both sides, and the order matters. `Post.tsx` now resolves the key
from the UNTRANSLATED `story.back`, which repairs every row already cached
with a corrupted key — no re-translation, no model calls, no backfill.
`storySource` strips `demo` before the model sees it, so we stop paying to
corrupt a value nobody reads from there.

The general rule is in CLAUDE.md: a translated card must never be the source
of an identifier. Translation is for what a reader reads. Anything the code
*matches on* has to come from the original row.

### The last hardcoded heading

`Illusion.tsx` printed "What you saw" and "What was real" as literals. The
pairs beneath them are translated with the rest of the drill, so a reader in
any other language got translated content under two English headings — on the
news card, which is the demo.

Section 22 already recorded that partial translation is worse than none, and
that the thirty-odd hardcoded strings had been extracted. This was the one
that got missed, and a grep of the card components for JSX text finds it in a
second. That grep is now the check, rather than anyone's memory.

### Still open

The four demo components are themselves English-only — none of them imports
the dictionary. Fixing the key above brings the lessons back; their body text
is still English in every language. That is a larger piece of work and the
scripted scam messages inside them are content rather than labels, so they
want translating well rather than quickly.

---

## 29. Shipped fix: English is a language, so it says so

The question that produced this was whether the untranslated interactive
lessons could just be left to the browser's own translator, or removed. The
answer turned out to be neither, and the reason is the same reason it was an
accessibility fault rather than a translation gap.

`<html lang>` already follows the reader's choice. So a reader on Spanish got
`<html lang="es">` wrapped around Home, About, Privacy, the sign-up form and
all four interactive lessons — every one of which is still written in
English. English text, declared as Spanish.

For a sighted reader that is invisible. For somebody using a screen reader it
is close to unreadable: the reader switches to a Spanish voice and pronounces
English words with Spanish phonetics. It is WCAG 2.2 SC 3.1.2, Language of
Parts, and it was failing across most of the app's chrome rather than in one
corner.

Marking each of those regions `lang="en"` fixes it, and it answers the
original question on the way: a browser's translator cannot offer to translate
a section it has been told is already in the target language. The attribute
that makes a screen reader pronounce English correctly is the same attribute
that makes Chrome offer to translate it. The accessible fix and the practical
one are one change.

`ReadAloudButton` declares the reader's language back, because every string it
renders comes from the dictionary and it sits inside those English regions —
the same fault pointing the other way.

The demo faces also carry a visible line, from the dictionary and therefore in
the reader's own language, saying the lesson is in English. A reader who meets
an English lesson should be told, not left to conclude the app is broken.
Removing the lessons was the other option on the table and was the wrong one:
they are the only thing on AI Sec Learn that is ours rather than a link to
somebody else's guide.

None of this is translation. The four demos are still English and section 28
still records that. What changed is that the app now tells the truth about
which language each part of it is in, which is the precondition for both a
screen reader and a translator doing anything sensible with it.

Also closed here: the Accessibility panel was 288px wide and anchored right,
with nothing to spare at a 320px viewport. It now carries a max-width that
keeps a 16px gutter at any width. AUDIT.md item 12.

---

## 30. Shipped extension: the inbox is the second front door

Every daily drill has ended with "just hit reply and tell me which one, in
your own words". A reader who replied with an answer got a grade. A reader who
replied with a *question* got nothing at all, and so did a reader who wrote
back to the grade itself. The invitation was real and the door was half open.

Now a reply that is not a fresh drill answer goes to Ask FlipSec, the same
assistant and the same instructions the website uses, and the answer is
threaded back into the conversation the reader is already in. Nothing about
the product changed; the moment-of-need half of it simply stopped requiring
the reader to open a browser.

That is worth more than convenience. The people these scams take the most from
are older, and are far likelier to be in their mail than on a site they visited
once. Mail is where the suspicious message already is.

### The grade had to thread before any of this made sense

Three separate sessions reported the email loop broken. Each time it had
worked: the reply was matched to the right drill, graded, and delivered. To a
different thread, because `sendGrade` called `messages/send`, which always
creates a new message with its own subject. The reader watched the
conversation they replied in and saw silence.

The first fix read the incoming message id from the webhook and replied to it.
It was deployed, it was correct, and it did nothing, because the payload did
not carry that field under the name the docs give — and a missing id falls
back to sending a new message, deliberately, so a grade is never lost. Silent
correctness is the hardest kind of bug to see.

The fix that worked stopped asking the payload for anything. `sentDrills`
already holds the id of the drill WE sent; AgentMail returned it from its own
send endpoint, and the reader's reply had just been matched against it. It is
the same identifier space the reply endpoint takes in its path. Answer your own
message and the conversation takes care of itself.

The general lesson is the one worth keeping: prefer an identifier you have
already watched work over one a document promises.

### Three guards, none optional

**Only confirmed subscribers are answered.** We do not verify SPF or DKIM on
inbound mail, so `from` is forgeable. An address that answers any stranger with
a model call is an open door onto somebody else's bill.

**`emailAsk` is its own rate-limit kind**, five per reader per hour. Section 23
records what happened when three budgets shared one table and a translation run
took the assistant offline; a fourth feature sharing the assistant's budget
would repeat it with the roles swapped.

**The inbound route refuses automatic mail** before anything is written —
RFC 3834's `Auto-Submitted`, plus `Precedence: bulk`, `X-Autoreply`,
`List-Id`, and the usual subject lines. This one is load-bearing in a way the
others are not. The drill path was safe from an auto-responder only because of
one-graded-answer-per-drill; a question has no such natural end, so our answer
provoking their auto-reply provoking our answer would run all night at a model
call per turn. The rate limit is the backstop, the header check is the fence.

### The chain was only as good as its weakest hop

Threading shipped broken once more after all of that, and the shape of the
failure is the part worth keeping. `replyToMessageId` has to cross five
scheduled functions. Four were wired; `gradeReply` accepted the argument and
never passed it to `saveGrade`, so `sendGrade` saw nothing and took the
fallback.

Nothing failed. A grade with no anchor is supposed to go out as its own
message rather than not go out at all, so the logs were clean, the tests
passed, and the mail arrived in the wrong conversation for a third time.

What found it was a difference rather than an error: emailed QUESTIONS came
back threaded and grades did not, and the question path is precisely the one
that skips `gradeReply`. When one path through a feature works and a
near-identical one does not, diff the hops rather than the behaviour. A
deliberate fallback will hide a broken chain from the logs, the tests and the
recipient at the same time.

### Verified

Proven on production against a real mailbox, with a fresh subscriber each
round so the one-answer-per-drill guard could not mask the result: drill
delivered, reply matched to the right drill by `in_reply_to`, graded
`correct: true`, grade delivered into the reader's own thread in 1.5 seconds,
then a follow-up question answered in that same thread with the previous turn
remembered. Evidence in AUDIT.md section 5b.

### What it does not do yet

The answer is single-threaded per subscriber and remembers the conversation,
but it cannot see an attachment: images are the one thing the website's
assistant takes that the email one does not, and a forwarded screenshot of a
suspicious text is exactly what somebody would send. That is the obvious next
piece.

---

## 31. Shipped fixes: the last English labels, and tabs that follow you down

Two small changes with one thing in common: both were found by somebody using
the app rather than by reading it.

### The labels a text sweep could not see

Section 22 recorded that partial translation is worse than none, and section 28
recorded fixing the last hardcoded card string. Neither was the last one.
`ScamFlow.tsx` printed "The setup", "The hook" and "The loss" over every
translated news lesson — on the feed that is the demo.

It survived the sweep because that sweep looked for text in JSX, and these
strings sat in a **data array** one hop from where they render. `label` now
holds a dictionary key, the way `FLIP_LABEL` and `BACK_LABEL` already did.

The rule is now: grep for string literals as well as for JSX text. A label
stored away from its render site is exactly what a text search misses, and
this is the third time this class of bug has shipped.

It was found by a report that News translated and Learn and Jobs did not. That
turned out to be two different things at once, and neither was quite the claim:
Jobs translates fully; the crawled Learn guides translate fully; but the four
authored lessons are the NEWEST cards in Learn, so they sit at the top and are
the first thing anybody flips, and their backs are English by design. A reader
who flips the top card of Learn and sees English is describing something true
about a feed that is otherwise fine.

Settled by driving the live site in Spanish with headless Chrome rather than
by arguing from the database, which said the translations existed. Both were
right; they meant different cards.

### Tabs that follow you down

Reaching the bottom of a feed left no way to switch feeds without scrolling all
the way back. The tab row is now sticky under the header.

The offset is the part worth keeping. A fixed pixel `top` is wrong three ways
here: the header **wraps** at narrow widths, and both it and the tab row grow
with browser zoom and with the in-app larger-text preference. Measured, the
header is 69px on a desktop and 121px at 320px — any constant would have been
wrong somewhere. `useStickyVar` publishes both heights from a `ResizeObserver`.

The accessibility half is the one that is easy to skip. A sticky bar covering
the element you just tabbed to is WCAG 2.2 SC 2.4.11, and this bar sits
directly over the next card down. Anything scrolled to or focused now clears
both heights, which also stops a card permalink landing under the chrome.

On an app whose accessibility is the differentiator, shipping a convenience
that breaks keyboard focus would have cost more than it bought.

---

## 32. Shipped fix: what the other two subscriptions were for

The question was a product one — the news drill is the part you can reply to,
so what does subscribing to Learn or Jobs actually get you? Reading the send
path to answer it turned up a defect worth more than the question.

`pickTodaysCard` did `take(1)` and returned the newest card of that kind, with
no memory of anything. A drill rotates per reader through `lastDrillId`. These
two did not rotate at all, so every Learn and Jobs subscriber received the
**same card every morning** until the crawler published a newer one — and most
crawls publish nothing, because `saveRawStory` drops what it has already seen.
One afternoon run found 60 items and saved zero. "Until a newer one" is
routinely days.

That is not a thin feature. It is a daily email that repeats itself, which is
how a sender earns spam complaints, on a domain whose deliverability is
already the weakest thing in the system. Strictly worse than not offering the
subscription.

### The fix changed shape while it was being written

The first plan was to mirror the drill: store `lastCourseId` and `lastJobId`
per subscriber and pick the first card that is not the last one sent. Writing
it showed the flaw — one stored id can only ever **alternate between two
cards**. It would have turned one repeating card into two.

Rotating on a day index instead (`day % length`) walks the whole feed, needs
no schema change at all, gives every subscriber the same card on the same day,
and makes a rerun of one day's send pick the same card, which the per-day
idempotency key already assumed. Seventeen guides now take seventeen days to
come round instead of one guide arriving seventeen times.

Worth noticing: the simpler fix was also the better one, and it was only
visible after starting the more complicated one.

### The design half

News was a loop and the other two were broadcast. That stopped being true in
section 30: any reply which is not a drill answer now reaches Ask FlipSec. So
those readers could already hold a conversation, and nothing in the mail told
them, because only the drill section ever asked for a reply. Both sections now
invite one. A code comment stating their replies were logged and dropped was
corrected — it had been true that morning.

### Deliberately not built

A quiz for Learn or Jobs. Redundant in form and weaker in substance: the news
drill tests a **skill** against a real incident — here is what happened to
somebody, which part should have warned them. A Learn quiz would test whether
a reader read a guide, which is comprehension, and the Voice section says
readers are not marked, graded or set homework. A job listing has no right
answer to test at all.

One quiz, on the one feed where getting it right means something. This is
recorded in CLAUDE.md so it is not proposed again.

---

## 33. Parked: translating the interactive lessons

Measured rather than estimated: **86 strings, 753 words** across the four demo
components, which is 946 dictionary lines including the ten other languages.
An evening's work. Size is not why this is parked.

Two of the four need **localising**, not translating, and one of those is a
safety matter rather than a quality one.

`ConfidentWrongDemo` prints invented phone numbers — `555-0142`, `555-0199`.
The `555-01xx` range is a North American fiction convention, so an American
reader knows on sight that it is fake. A Spanish or Japanese reader does not;
it simply looks like a phone number. And the whole lesson is that **an invented
phone number is somebody else's phone, or a scammer's**. Translating those
digits literally builds a lesson that hands a reader a number to dial. The
same component invents a "Consumer Fairness Act", which reads plausibly inside
an Anglo legal culture and as nothing at all outside one.

`ScamWritingDemo` has the milder version: a sign-in from Cebu, an appointment
with Dr Reyes. Exactly right for a Filipino reader and arbitrary for a Russian
one — and the lesson is "these read perfectly, that is the point", which a
message that reads as translated quietly undermines.

`VoiceDemo` and `InjectionDemo` are close to locale-neutral and would
translate cleanly.

### The order when it is picked up

1. **Genericise the locale-bound specifics in English first.** Drop the
   realistic fake digits, describe the invented law instead of naming one,
   neutralise the place names. This improves the English lesson on its own
   merits: a demo showing plausible fake digits is a small hazard even to an
   English reader.
2. **Then translate all 86 strings**, which is mechanical once nothing depends
   on a US phone convention.

Doing step 2 without step 1 is worse than leaving it in English, which is the
rule section 22 already states in general and this is the sharpest instance of
it in the app.

### Why it is acceptable to ship without

Every demo face carries `lessonInEnglish` in the reader's own language, so a
reader is told rather than left to conclude the app is broken. Section 31
records the related trap: those four are the NEWEST cards in Learn, so they
sit at the top of the feed and are the first thing anybody flips, which makes
the gap look larger than it is. Every crawled guide beneath them translates in
full.

---

## Appendix: the Convex mental model

Worth re-reading when something does not behave.

- **Queries** read only. Subscribe with `useQuery`. The sync engine reruns them when any document they read changes and pushes to every client over a WebSocket.
- **Mutations** write, run as transactions, roll back entirely on an exception, and cannot make network calls.
- **Actions** make network calls, sit outside the sync engine, and reach the database only by scheduling queries and mutations.
- **The scheduler** is how a mutation reaches an action. Scheduling inside a mutation is itself a database write, so a failed mutation schedules nothing.
- **Indexes** via `withIndex`. Every lookup in this app goes through one.
- **Hot counters** cause concurrency conflicts. If reaction counts ship, use the sharded counter component rather than read-add-write.
