# FlipSec

**Flip the news. Learn the threat.**

An AI security awareness app. The feed looks like social media and carries real stories about AI being used against people. Flip any post and it becomes a drill built from that exact story.

- **Domain:** flipsec.ai
- **Hackathon:** Convex All Gas
- **Deadline:** Monday, Sep 22, 12:00 PM PT
- **Submission:** vibeapps.dev
- **Live URL target:** `https://flipsec.convex.site`

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
| Convex depth | Reactive queries drive the feed, mutations record attempts, the scheduler chains crawl to AI to write, cron triggers crawls, an httpAction receives inbound mail, auth scopes progress per user. |
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

Three minutes, mostly screen. Talk less, click more.

**0:00 to 0:20** The hook. "Last week someone lost money to a voice clone of their daughter. Most people still think bad grammar is how you spot a scam." Feed loads behind the line.

**0:20 to 1:00** The flip. Scroll the feed so it reads like a feed. Open a real post. Flip it. Answer wrong on purpose and show the explanation. The whole product lands inside the first minute.

**1:00 to 1:40** Where content comes from. Convex dashboard, a crawl running, rows appearing, a new post sliding into the feed live with no refresh. This is the Convex depth moment.

**1:40 to 2:20** The email loop. Drill arrives in a real inbox, reply with an answer, grade appears back in the app.

**2:20 to 2:50** Who it is for. One honest sentence about teaching Internet Safety to middle schoolers and why the reading level matters.

**2:50 to 3:00** URL on screen.

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

The language selector now does more than relabel buttons. Choosing Spanish or
Filipino sends a card's title and summary to OpenAI once, in the same call
shape already defined for the whole card (title, summary, red flags, back,
drill), and the result is cached in `storyTranslations` keyed by story and
language so it is generated once and read many times.

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

## Appendix: the Convex mental model

Worth re-reading when something does not behave.

- **Queries** read only. Subscribe with `useQuery`. The sync engine reruns them when any document they read changes and pushes to every client over a WebSocket.
- **Mutations** write, run as transactions, roll back entirely on an exception, and cannot make network calls.
- **Actions** make network calls, sit outside the sync engine, and reach the database only by scheduling queries and mutations.
- **The scheduler** is how a mutation reaches an action. Scheduling inside a mutation is itself a database write, so a failed mutation schedules nothing.
- **Indexes** via `withIndex`. Every lookup in this app goes through one.
- **Hot counters** cause concurrency conflicts. If reaction counts ship, use the sharded counter component rather than read-add-write.
