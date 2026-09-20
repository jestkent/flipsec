# Hackathon log

- **Project:** FlipSec
- **Event:** Convex All Gas Hackathon
- **What it does:** A social-style feed of real AI scams where flipping a post opens a lesson built from that exact story, and a daily drill emailed to readers is graded from their plain-English reply.
- **Live app:** https://hallowed-nightingale-322.convex.site
- **Repo:** https://github.com/jestkent/flipsec
- **Frontend:** Convex static hosting
- **Convex deployment:** https://hallowed-nightingale-322.convex.cloud
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, actions, HTTP actions, crons, scheduled functions, realtime queries
- **Auth:** none
- **AI models:** gpt-4o-mini
- **Started:** 2026-09-20T17:35:41Z
- **Last updated:** 2026-09-20T22:32:20Z

## Log

### 2026-09-20 - 488533c
Started the repo with the build plan, a .gitignore written before the first
commit, and project docs (`PLAN.md`, `CLAUDE.md`, `README.md`).

### 2026-09-20 - 76054f6
Scaffolded Vite, React, TypeScript and Tailwind v4 with Convex installed, then
defined the schema: stories, drills, attempts and subscribers, with indexes on
url, status, published, story and user. Convex features: schema, tables, indexes
(`convex/schema.ts`).

### 2026-09-20 - 9f19da6
First Firecrawl crawl against the FTC consumer alerts index, running in the Node
runtime because the Firecrawl SDK imports Node built-ins. Proved usable article
text comes back before building anything on top. Convex features: actions
(`convex/crawl.ts`).

### 2026-09-20 - 1e4f165
Made the crawl two-stage: scrape the index for article links, then scrape each
article for its body. Writes go out through a scheduled mutation that dedupes on
the by_url index, so the action never touches the database. Crawl spacing honours
each source's robots.txt, including FTC's ten second crawl delay. Convex
features: scheduled functions, mutations, indexes (`convex/crawl.ts`,
`convex/stories.ts`).

### 2026-09-20 - 4dde136
Chained the rest of the content pipeline. One OpenAI call turns crawled
government prose into a plain-language summary, red flags and a tactic;
publishing clears the raw text; a second call writes the drill. A cron re-crawls
every six hours. Convex features: actions, mutations, scheduled functions, crons
(`convex/stories.ts`, `convex/drills.ts`, `convex/crons.ts`).

### 2026-09-20 - 66d1098
Built the feed and the flip. listPublished walks the by_published index and
strips raw text before it leaves the server; the drill query withholds the answer
key until a reader commits. The flip is a 3D rotation with perspective on the
parent, 520ms on an asymmetric curve, and a cross-fade under
prefers-reduced-motion. Convex features: queries, realtime queries, indexes
(`convex/stories.ts`, `src/components/Post.tsx`, `src/index.css`).

### 2026-09-20 - ac2f215
Deployed to Convex static hosting. The component owns the root, so app HTTP
routes move under /api. Convex features: registered component
(`convex/convex.config.ts`).

### 2026-09-20 - a47c98e
Posts carry the source's og:image where one exists and tactic art where it does
not. The lesson gained three how-it-works steps generated in the existing drill
call, and an ask box answering questions scoped to one post, capped by length,
by reader and by output tokens (`convex/crawl.ts`, `convex/questions.ts`).

### 2026-09-20 - 1705f5a
Fixed tactic classification drifting to the catch-all: the guidance is now an
ordered list and both classification calls run at temperature 0, so two runs on
the same input agree (`convex/stories.ts`).

### 2026-09-20 - f8b8e34
Turned the flip into a lesson rather than a quiz, at the owner's direction. The
back of a post opens on a tactic-tinted flow diagram, a note on why the scam
works, an on-demand tutor explanation cached per story, and the drill underneath
as optional practice. Convex features: actions, queries
(`convex/lessons.ts`, `src/components/LessonBack.tsx`, `src/components/ScamFlow.tsx`).

### 2026-09-20 - c1e0b58
Closed the email loop in both directions. A cron sends one drill a day from the
AgentMail inbox and records which drill went to which subscriber. Replies arrive
on a Convex HTTP action under /api, which answers 200 immediately and schedules
the work; OpenAI grades the free text against the answer key and writes the
result back onto the attempt. Round trip proven on the production deployment: a
drill sent from the project inbox, a reply typed in plain English from a normal
mail client, and the grade landing on the attempt. AgentMail is called over REST
because its SDK imports a payments module Convex cannot bundle. Convex features:
HTTP actions, crons, scheduled functions, mutations, actions (`convex/http.ts`,
`convex/email.ts`, `convex/attempts.ts`, `convex/subscribers.ts`).

### 2026-09-20 - 01b3a86
Tightened what reaches the feed. One OpenAI call now judges four gates beside the
summary: whether AI is genuinely in the story, whether it is a trick a reader
could spot, whether it could happen to an ordinary person, and whether the
subject is fit for a middle school screen. The safety gate names a category
rather than answering yes or no, because a boolean false-positived on ordinary
crime reporting. Added the AI Incident Database as a third source, reading only
its own CC BY-SA description field (`convex/stories.ts`, `convex/crawl.ts`).

### 2026-09-20 - 4396003
Audit pass. Made the daily-drill test send internal so it cannot be called from a
browser, backed the per-reader question cap with a deployment-wide cap on a new
by_time index, fixed the flipped card collapsing to a sliver, and guarded every
localStorage call so a private window cannot blank the feed. Convex features:
indexes, actions (`convex/email.ts`, `convex/questions.ts`, `convex/schema.ts`,
`src/components/Post.tsx`, `src/components/Feed.tsx`).

### 2026-09-20 - b7ef03b
Made the flip unmissable with a badge on both faces plus a clickable card, and
replaced the "why it works" paragraph with a panel contrasting what the victim
believed against what was actually happening, drawn from structured model output
rather than a generated image (`src/components/Post.tsx`,
`src/components/Illusion.tsx`, `convex/drills.ts`).

### 2026-09-20 - 992f71e
Installed the Convex hackathon skill into the project and rewrote this log in its
documented format, replacing a hand-written version
(`.claude/skills/convex-hackathon-skill/`).

### 2026-09-20 - ac3974d
Completed the Convex integration that the hackathon setup prompt calls for and
that had been missed until now. Installed the official Convex plugin at user
scope, which carries the Convex agent skills and the Convex MCP server, and
verified it through the plugin listing rather than the install exit code. This
project qualifies as a Convex project, so its managed AI files are installed
too: backend guidelines, `AGENTS.md`, a managed section appended to
`CLAUDE.md`, the Convex agent skills, and `skills-lock.json`. The hand-written
parts of `CLAUDE.md` were left intact (`convex/_generated/ai/guidelines.md`,
`skills-lock.json`, `.claude/skills/`).

### 2026-09-20 - 48ed8c6
Fixed the ask box refusing nearly every question, including its own placeholder.
Two causes: the model was handed only the sixty word summary and told it was all
it knew, and the prompt made refusing the safe default. The internal query now
joins the drill so the model gets the stages, the red flags and the illusion
pairs, and the prompt names refusing as the rare exception. Reader text is still
treated as a question and never an instruction (`convex/questions.ts`).

### 2026-09-20 - b9f3499
Added an About page: what the app is, who it is for, where the stories come from
with the CC BY-SA attribution the AI Incident Database requires, and how it is
built. Two views held in component state rather than adding a router for one
link (`src/App.tsx`, `src/components/About.tsx`).

### 2026-09-20 - b2eeade
Added the builder's own reason for making it, in first person and limited to
what he actually said: he teaches Internet Safety to 6th through 8th graders and
could not find material about the scams his students were meeting
(`src/components/About.tsx`).

### 2026-09-20 - 2ef7e0b
Widened the audience past students, at the owner's direction. The copy now
opens on a grandparent who got a call in a voice they know, and says plainly
that the 7th grade reading level is not the audience. The accessibility change
matters more than the copy: body text went from 14px to 16px and every muted
grey moved one step darker across the feed, the lesson, both panels, the signup
and the About page, because small grey type does not serve the readers this is
now claiming to be for (`src/components/About.tsx`, `Subscribe.tsx`,
`Post.tsx`, `LessonBack.tsx`, `Illusion.tsx`, `ScamFlow.tsx`).

### 2026-09-20 - docs pass
Brought the written record back in line with the app: the README still described
the flip as opening a drill and listed only two of the three sources, which left
the AI Incident Database's CC BY-SA attribution off the repo's front page. The
project guide gained the type-size floor and the audience note so neither gets
undone by a later change (`README.md`, `CLAUDE.md`).
