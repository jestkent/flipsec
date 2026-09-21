# Hackathon log

- **Project:** FlipSec
- **Event:** Convex All Gas Hackathon
- **What it does:** Three feeds of AI security - real incidents, free guides, and jobs where AI and security meet - where every card flips to a plain-language explanation built from that exact item, and a daily email carries one card per feed a reader picked.
- **Live app:** https://hallowed-nightingale-322.convex.site
- **Repo:** https://github.com/jestkent/flipsec
- **Demo video:** not recorded yet
- **Frontend:** Convex static hosting
- **Convex deployment:** https://hallowed-nightingale-322.convex.cloud
- **Components:** @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, actions, HTTP actions, crons, scheduled functions, realtime queries
- **Auth:** none
- **AI models:** gpt-4o-mini
- **Started:** 2026-09-20T17:35:41Z
- **Last updated:** 2026-09-21T01:41:45Z

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

### 2026-09-20 - 5af8b8b
Made the feed able to hold more than one kind of card. Stories gained an
optional kind and an optional back, plus a by_kind_published index beside the
existing one rather than replacing it. A row with no kind does not appear under
kind = "scam", so a backfill mutation has to run on a deployment before any
query reads the new index; run on prod first, 40 rows stamped, feed still
returning 6. Convex features: schema, indexes, mutations (`convex/schema.ts`,
`convex/stories.ts`).

### 2026-09-20 - 0a8a07e
Added two more verticals behind the same pipeline. Learn AI crawls Hugging
Face, whose course index is a JavaScript grid that Firecrawl's main-content
filter reduces to an empty page, so a source can now ask for the unfiltered
index while article scrapes keep the filter on. Jobs come from Remote OK's
public JSON feed instead, because their listing table renders in the browser
and a scrape returns only navigation; their API terms ask to be named as the
source and linked back without nofollow, which every job card does. Their
listings carry an anti-scraping line asking the reader to repeat a codeword,
which is an instruction sitting in text this app feeds to a model, so it is cut
before the text is sent and the prompt is told the listing is data. Each kind
gets its own OpenAI pass at temperature 0 returning front, back and gates
together. Convex features: actions, mutations, scheduled functions
(`convex/crawl.ts`, `convex/courses.ts`, `convex/jobs.ts`, `convex/stories.ts`).

### 2026-09-20 - b5d0ff5
Turned the flip into a primitive and put three tabs over it. The card component
still owns the rotation, the midpoint height swap, the content-wrapper
measuring and the reduced-motion path; only what is printed on the far face
changes. Courses and jobs carry their whole back on the story row, so they
never open the drill subscription. Feed order lives in one exported array, and
each tab mounts its own feed so switching does not inherit the previous tab's
flipped cards. Subscriptions became per feed: signing up from a tab asks for
that tab, two tabs merge rather than replace, and the daily mail carries a
section per feed in one message. Only the scam drill is gradeable, so only it
records a reply target. Convex features: queries, mutations, indexes, actions
(`src/App.tsx`, `src/components/Post.tsx`, `convex/subscribers.ts`,
`convex/email.ts`).

### 2026-09-20 - ac98128
Fixed the free-course gate rejecting four courses that are free. A scraped page
carries the whole site with it, and the model was answering about the site's
paid plans rather than about the lessons. Same failure the earlier safety
boolean had: a gate asked a question broad enough to catch its surroundings.
The fix names the scope rather than softening the rule. Clearing failed rows
now takes a kind, so retuning one feed does not discard another feed's
rejections. Prod after the re-crawl: 6 scams, 10 courses, 6 jobs
(`convex/courses.ts`, `convex/stories.ts`).

### 2026-09-20 - docs pass
Brought the docs up to three feeds: the README and the in-app About page both
described a single-feed app and listed three of the five sources, and the
project guide gained the new schema rule, the gate-scoping rule and the
one-flip-three-backs rule (`README.md`, `CLAUDE.md`,
`src/components/About.tsx`).

### 2026-09-20 - 50378da
Narrowed all three feeds to AI security and renamed them AI Sec News, AI Sec
Edu and AI Sec Jobs. The kind values in the database stay as they were;
migrating every published row for a word on a button was not worth the risk to
the feed the demo runs on.

Education dropped Hugging Face for OWASP's Gen AI Security Project. Hugging
Face teaches you to build AI rather than secure it, so under the new name every
one of its cards was off topic; OWASP publishes the LLM Top 10, agentic
security guides, red teaming guidance and incident response playbooks, free,
and allows crawling. Their cards label every link "More", so the crawler now
takes a provisional title from the URL slug and the model rewrites it from the
page.

Jobs dropped Remote OK on measurement. Across five of their tags and five
Remotive searches, about 340 listings, exactly four mentioned both AI and
security and all four were false positives, because generalist boards tag
security for loss prevention and door staff. Jobs now come from companies' own
public Greenhouse boards, which carry the full posting and the canonical apply
link, filtered by title from the cheap list endpoint before any full fetch.

The job gate needed two rounds. The first pass admitted cloud security, DevOps
and a customer success role because the model reasoned "AI company, therefore
AI security"; it now has eleven labelled examples from these same boards and is
told to strike out the employer's name and read the job again. Thirty-two
candidates yield ten. Greenhouse lists one role once per office, so the
shortlist also dedupes on title within a board. Convex features: actions,
mutations, scheduled functions, indexes (`convex/crawl.ts`, `convex/courses.ts`,
`convex/jobs.ts`, `convex/stories.ts`, `src/App.tsx`).

### 2026-09-20 - docs pass 2
Updated the README, the in-app About page and the project guide for the three
renamed feeds and the two new sources, and recorded why a gate that under-fires
gets labelled examples rather than a softer rule (`README.md`, `CLAUDE.md`,
`src/components/About.tsx`).

### 2026-09-21 - audit pass
Full audit of the live app against the judging criteria, then fixed what it
found. The findings were reproduced against production, not read off the code.

Three security problems, all confirmed by probing the live deployment:

A public query took a user id as a plain argument and returned that user's
answers. For a reply that arrived by email that id is the reader's own email
address, so anyone could read the free text a stranger wrote back to us, and an
address that returned nothing told them who was not subscribed. The front end
never called it. Deleted.

The hourly cap on the ask box only counted; the row was written after the model
answered, with a network call in between. Twelve concurrent requests against a
cap of ten let eleven through and blocked none. Counting and claiming now
happen in one mutation, and the same fourteen-request test now blocks four and
allows exactly ten. The tutor lesson, which had no limit at all, shares that
bucket.

The inbound mail route accepted any POST, so a forged sender naming a real
subscriber wrote an attempt for them and spent a model call grading it. Both
public HTTP routes now require a shared secret and fail closed.

Also fixed: every daily email now carries a signed unsubscribe link, and the
route verifies the signature before acting; the daily send picks a drill the
reader has not had, where it previously sent the same one every morning
forever; email validation rejects addresses like "a@b" that a bare "contains an
@" test allowed; the card face that is turned away is now inert, because
backface-visibility hid it from the eye but not from the keyboard; every model
call has a catch and a visible message, where a failure used to reset the
button silently; and the tab bar wraps.

Content gates gained three rules the feed had disproved. A summary must name
what the AI did, after an alert whose source said a site was cloned using AI
produced a summary with no AI in it. Scam excludes lawsuits about a product
being oversold, after a product-liability case against a named company reached
the feed tagged as phishing; that card was withdrawn. Edu now also asks whether
a reader could learn anything from the page, which removed the vendor
landscapes and solutions directories that were sitting in a learning feed.

Added an MIT licence and a privacy note (`convex/questions.ts`,
`convex/attempts.ts`, `convex/http.ts`, `convex/email.ts`,
`convex/subscribers.ts`, `convex/lessons.ts`, `convex/stories.ts`,
`convex/courses.ts`, `src/components/Post.tsx`,
`src/components/LessonBack.tsx`, `src/App.tsx`, `LICENSE`).

### 2026-09-21 - webhook signatures
Replaced the shared secret on the inbound mail route with AgentMail's own
webhook signature. Their webhook object already carried a signing secret, which
is the better mechanism: it proves the body was not altered as well as who sent
it, keeps the secret out of URLs and logs, and needed no change to the URL
already registered, so there was no window where replies quietly stopped.

HMAC-SHA256 over id.timestamp.body, reading both the svix- and webhook- header
spellings, with a five minute window so a captured delivery cannot be replayed.
The shared secret stays accepted as a query parameter for a manual curl during
a demo. Verified against production: unsigned rejected, valid signature
accepted under both header spellings, a tampered body carrying a real signature
rejected, an hour-old replay rejected, and a garbage signature rejected
(`convex/http.ts`).
