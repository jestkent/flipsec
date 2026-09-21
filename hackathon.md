# Hackathon log

- **Project:** FlipSec.ai
- **Event:** Convex All Gas Hackathon
- **What it does:** Three feeds of AI security - real incidents, free guides, and jobs where AI and security meet - where every card flips to a plain-language explanation built from that exact item. Ask FlipSec is a conversational AI safety guide for suspicious content, recovery, privacy and AI questions, and a daily email carries one card per feed a reader picked.
- **Live app:** https://hallowed-nightingale-322.convex.site
- **Repo:** https://github.com/jestkent/flipsec
- **Demo video:** not recorded yet
- **Frontend:** Convex static hosting
- **Convex deployment:** https://hallowed-nightingale-322.convex.cloud
- **Components:** @convex-dev/static-hosting, @convex-dev/agent
- **Convex features:** schema, tables, indexes, queries, mutations, actions, HTTP actions, crons, scheduled functions, realtime queries
- **Auth:** server-issued anonymous browser sessions in the current local follow-up; no OAuth accounts. Mailbox confirmation controls email consent.
- **AI models:** gpt-4o-mini, gpt-4o-mini-tts
- **Started:** 2026-09-20T17:35:41Z
- **Last updated:** 2026-09-21 (readiness follow-up; see READINESS.md)

## Current status

See [READINESS.md](READINESS.md) for the current verified status and limitations.
The earlier reliability work is committed. AUDIT.md section 5b records a real
production email round trip and threaded follow-up on September 21. The current
follow-up (anonymous sessions, job retirement, localized onboarding and shorter
localized exercises) is verified locally and has not been deployed to production.
Cold-mailbox signup, observed user sessions, video, social post and final
submission evidence are still pending. Exact production/source parity has not
been independently established during this follow-up.

## Log

### 2026-09-20 - visible read aloud and color vision support

Moved Accessibility options into the main navigation so readers can find them
without reaching the footer. Added saved red-green, blue-yellow and no-color
palettes while continuing to identify every status through words, borders and
icons. News, Learn and Jobs cards now read either visible side aloud with a
clear Stop reading state; Ask FlipSec responses have the same control. Starting
another item stops the current voice, and leaving its content stops speech.
The feature uses browser speech synthesis and keeps the underlying semantic
screen-reader path intact (`src/components/ReadAloudButton.tsx`,
`src/components/AccessibilityOptions.tsx`, `src/components/Post.tsx`,
`src/components/SafetyTools.tsx`, `src/index.css`).

### 2026-09-20 - calmer UI, mission and visible stack

Renamed the three reader tabs to AI Sec News, AI Sec Learn and AI Sec Jobs.
Simplified the homepage from three hero actions to two, replaced the three
boxed pathway cards with quiet top-rule sections, shortened the explanation
from four steps to three, and removed the duplicate implementation card grid.
The flip and latest real story remain the strongest visual elements.

Added a compact shared footer strip naming Firecrawl, OpenAI, Convex and
AgentMail with the job each performs. Judges can now see the full integration
story from every view without interrupting the product flow. Added short
mission and vision statements to About and preserved the accessibility
settings, large-text reflow and keyboard behavior
(`src/App.tsx`, `src/components/Home.tsx`, `src/components/About.tsx`).

### 2026-09-20 - app-wide accessibility

Audited every reader-facing view for keyboard use, screen readers, low vision,
color vision, motor access, motion sensitivity and text reflow. Route changes
now announce and move focus, feed tabs support Arrow/Home/End keys, and a card
flip hands focus to the control on its visible face while the hidden side stays
inert. Forms gained labels, submit semantics, described help, live busy/results
and announced errors. Quiz answers now print their state instead of relying on
green or red.

Removed content clamps, made comparison panels stack at narrow widths, raised
compact controls to 44px targets, darkened muted and danger colors, hid
decorative art from assistive technology, and marked new-window links. Added a
saved Accessibility options panel for larger text, higher contrast and reduced
motion, alongside support for system motion/contrast preferences and Windows
forced-colors. Production build and lint pass; the only lint messages remain
the two pre-existing React advisory warnings
(`src/components/AccessibilityOptions.tsx`, `src/App.tsx`, `src/index.css`,
`src/components/`).

### 2026-09-20 - Ask FlipSec

Replaced the separate message and image checker screens with one conversational
AI safety guide. Ask FlipSec handles pasted suspicious content, temporary image
attachments, recovery questions, privacy, AI literacy and basic web app
security. Suggested prompts make the empty state useful, Ctrl + Enter sends,
Enter adds a line, and a topic match connects the conversation to a real card
from the live news feed.

The Convex Agent component owns durable text threads, so a follow-up keeps its
context and a browser refresh can restore the conversation. A local ownership
table scopes each public message query to the anonymous browser reader. Images
are resized locally and passed as temporary context, so they are removed after
the answer and are not written into the thread. Transactional per-reader and
deployment-wide limits are claimed before each OpenAI call
(`convex/assistant.ts`, `convex/assistantMessages.ts`, `convex/schema.ts`,
`src/components/SafetyTools.tsx`).
The Delete conversation control removes both the component thread and its
access mapping so an old transcript is not merely hidden from the browser.

### 2026-09-20 - safety tools

Added a fourth top-level view for the moment a reader has something suspicious
in front of them. The message checker accepts pasted text; the image checker
resizes JPG, PNG and WebP files in the browser before sending them. Both return
structured OpenAI output: observable clues, what those clues mean, one way to
verify the claim through a separately trusted channel, and what the check cannot
know. The result never calls an item safe and the image path does not pretend to
prove whether pixels were made by AI. A matching tactic links the result back to
a real, flippable story from the live news feed.

The submitted content is never inserted into Convex. A `toolChecks` table stores
only reader id, check kind and time, so a mutation can count and claim both the
per-reader and deployment-wide hourly limit in one transaction before OpenAI is
called. Convex features: schema, indexes, mutation, public actions and live query
(`convex/safetyTools.ts`, `convex/schema.ts`, `src/components/SafetyTools.tsx`).

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
Learn and AI Sec Jobs. The kind values in the database stay as they were;
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

### 2026-09-21 - rename to FlipSec.ai
Renamed the product to FlipSec.ai across the app, the emails, the unsubscribe
page, the model prompts, the crawler's user agent and the docs. The header
renders the suffix in a lighter weight so it reads as the domain it is.

Two things were deliberately left alone. PLAN.md keeps the original name
because it is the spec as written, and the dated entries in this log were not
rewritten to use a name the project did not have at the time. The browser
storage key that identifies a returning reader also keeps its old value;
renaming it would discard every existing reader's id for a cosmetic change.

Note for submission: the flipsec.ai domain does not currently resolve
(`NXDOMAIN`). The live app is the convex.site URL in the header above, and the
name is branding only until the domain is registered and pointed at the
deployment (`src/App.tsx`, `index.html`, `convex/`, `README.md`, `CLAUDE.md`).

### 2026-09-21 - visual redesign
Rebuilt the presentation layer on the supplied brand without touching the
backend. Nothing in convex/ changed in this pass, and all three feeds return
the same counts they did before it: 6 news, 11 guides, 10 roles.

The app previously opened straight onto a feed, so a first-time reader met a
list of cards with no idea what the product was or why they turn over. There
is now a home page: the tagline, one paragraph, two actions, live counts read
from the same queries the feeds use, the three pathways, a four-step
explanation of the flip, the most recently collected story, and a plain
account of what Firecrawl, OpenAI, Convex and AgentMail each actually do. The
counts are a live Convex query, so a crawl publishing while the page is open
moves them with no refresh.

Colour is now centralised as tokens in one stylesheet rather than the stock
neutral and rainbow scales spread across every component. Ivory page, white
cards, navy text, teal for actions, amber for the flip motif, coral only for
real errors. Status is never carried by colour alone: badges keep their word,
the selected tab changes weight as well as rule, the current nav item is
underlined.

The card front now carries what it was missing: the source, a headline, the
summary, and both a relative and an absolute date. The flip control became a
labelled button on both faces instead of an icon roundel a reader had to
guess at, and the rotation came down from 520ms to 220ms. An amber folded
corner is the recurring motif and doubles as the affordance.

Shared primitives replaced the per-component styling: Button, Badge, Card,
Eyebrow, Skeleton, EmptyState, ErrorNotice. Feeds load as card skeletons
rather than the word "Loading". Added a skip link, a visible focus ring on
every control, a footer, and a 128px logo in place of the 1254px 1.9MB
original (`src/index.css`, `src/components/ui.tsx`, `src/components/Header.tsx`,
`src/components/Home.tsx`, `src/App.tsx`, `src/components/Post.tsx`,
`public/brand/`).

### 2026-09-21 - brand lockup
Replaced the app-icon logo with the supplied horizontal lockup. Because that
artwork already contains the wordmark, the text that used to sit beside it in
the header was removed; a header that shows a logo saying the name and then
writes the name again is saying it twice.

The source is 2172x724 with a wide transparent margin, so it is trimmed to its
content box first, then shipped as a 256x64 lockup with a 512x128 @2x, plus
the mark alone squared at 96 and 192. The mark stands in below 640px where the
full lockup would crowd the navigation, and serves as the favicon. Everything
is sized by height with width auto, so the lockup cannot be stretched.

The artwork's own colours are the palette the redesign already uses - the same
navy, teal and amber - so nothing needed adjusting to match it
(`public/brand/`, `src/components/Header.tsx`, `src/components/Home.tsx`,
`src/App.tsx`).

### 2026-09-21 - calmer, and the card back as it was
The redesign had gone too far in one direction. The card front had become a
headline, a clamped summary and a full-width solid button, which made every
item in the feed look like a landing page rather than something to read.

Reverted the card to the shape that worked: the round flip badge over the
artwork at top right, the plain-language summary leading rather than the
source's own headline, the tactic back as a pill, and a quiet "See how this
works" line beside the source link at the foot. The whole front is a click
target again. The fixes from the audit stay - the drawn SVG icon instead of a
character the font does not have, the date, and inert on the turned-away face.

The accent moved from a saturated teal to a muted sage green, which is calmer
against ivory and is the colour the owner asked for. Contrast checked: 4.8:1 on
white, so white text on it still passes AA.

Also replaced the home page's row of large numbers with one sentence carrying
the same live figures, and dropped the count chips from the pathway cards. A
grid of statistics is the house style of a generated landing page and says less
than a sentence does (`src/components/Post.tsx`, `src/components/Home.tsx`,
`src/index.css`).

### 2026-09-21 - the flip, properly
The turn was a single rotation on a 220ms curve, which is a blink: over before
the eye has followed it, and flat no matter how good the easing. It is now
four things happening together over 460ms.

The rotation eases past its mark and comes back, the way a real card
overshoots and rocks down. The card scales to 0.955 as it goes edge on and
returns to full size as it lands, with the shadow deepest at the same instant,
which is what the eye reads as lifting off the page rather than spinning in
it. The lift had to live on the outer element because it and the rotation both
want the transform property.

The last part matters most and was the least visible. The card's height used
to change in one step at the midpoint, hidden by the card being edge on - but
everything below it in the feed still moved in a single frame. Height now
travels with the rotation, so the page settles instead of snapping. The
transition waits for the first measurement, or every card would animate up
from zero on first paint.

The badge answers on press with a scale, before the rotation begins, so a
longer turn never feels like a slow control. Reduced motion keeps a cross-fade
and none of the rest (`src/index.css`, `src/components/Post.tsx`).

### 2026-09-21 - two controls that were one control twice
Owner review caught two redundancies, both introduced by the redesign.

The back of a card had a header bar reading "Back to the story" and, at the
foot of the lesson, a link reading "Back to the story". Same words, same
action, one above the other. A back now has two exits that are genuinely
different things: the round badge in the corner, which is the same control in
the same position as on the front and catches a reader who turned the card by
accident, and the text link at the end of the reading, for a reader who has
finished and is already at the bottom. The badge is icon only, so the label
appears once.

The header had a "Start reading" button next to a "Feeds" link, and both went
to the same view. A header action has to offer something the navigation does
not, or it is one control drawn twice and the reader has to work out which is
real. The button is gone; the primary call to action lives on the home page
where it belongs. The remaining link is "Read" rather than "Feeds", because it
says what you would do there and the three feeds have their own tabs once you
arrive (`src/components/Post.tsx`, `src/components/Header.tsx`).

### 2026-09-21 - finished the multilingual and natural-voice work

The previous session stopped mid-edit and left the project unable to compile.
The visible errors were spread across five files, including two that had not
been touched at all, which was the useful clue: `localization.ts` had two
actions whose handlers had no explicit return type, so TypeScript could not
resolve `ctx.runQuery` without first resolving the action that called it. That
circular inference collapsed the generated Convex API surface to `any`, and
every unrelated file that reads `api` or `internal` started reporting implicit
`any` on parameters that had always been fine. Two return annotations fixed all
of it. The same class of bug has bitten this project before and the fix is
recorded in the project guide.

The natural voice was designed but never connected: the `speak` action existed
and worked, and the button still called the browser's own speech synthesis.
`ReadAloudButton.tsx` now tries OpenAI `gpt-4o-mini-tts` first and falls back
to browser speech on a failure, an hourly limit, or text over the server's
4,096 character cap, so Read aloud always does something. Generated audio is
cached in Convex file storage keyed by a hash of language and text, so a card
read twice costs one generation. "AI-generated voice" shows while that voice is
playing, which OpenAI's policy for synthetic speech requires.

Story translation was in the same state: the action, the cache table and the
public query all worked, and nothing on screen called them. A card's title and
summary now translate on demand when a reader picks Spanish or Filipino,
generated once per story and language and then read from cache, with an
"AI translated · View original English" toggle. Card backs are still English;
that gap is written down rather than papered over.

Verified on the dev deployment rather than assumed: all three feeds still
return their rows, a real translation call produces good Spanish and the second
call is served from cache, the assistant answers and creates a durable thread,
and the TTS action returns a reachable `audio/mpeg` file. None of the
security-critical backend files changed — the webhook signature check, the
transactional rate limits and the publishing gates are byte-for-byte what they
were (`convex/localization.ts`, `src/components/ReadAloudButton.tsx`,
`src/components/Post.tsx`, `src/localization.tsx`, `src/App.tsx`).

### 2026-09-21 - eleven languages, and a cap on the call that pays for them

The app reads in eleven languages instead of three: English, Spanish,
Simplified Chinese, Hindi, Filipino, Vietnamese, Russian, Japanese, Korean,
Brazilian Portuguese and French. Each one ships a full interface dictionary,
not translated card text sitting under English buttons, and the menu names
every language in its own script with its own `lang` attribute so a screen
reader pronounces it correctly.

The list had been spelled out as `v.union` literals in four files. It now lives
in two: an array in the frontend carrying the endonym, the `<html lang>` tag
and the browser-speech locale, and a pair of validators in `convex/languages.ts`
that the schema, the translate action and both cache modules import. Widening a
union of literals is additive, so rows written when only Spanish and Filipino
existed still validate - the deploy reported schema validation complete with no
migration.

Adding eight languages multiplied the uncached surface of `translateStory` by
five, and that public action called a paid model with no rate limit at all. It
now reserves a slot in `toolChecks`, but only after the cache is checked, so a
cache hit stays free and unmetered; a reader switching language on a warm feed
would otherwise spend their hourly budget on rows already paid for. Verified by
reading the table back: the miss wrote a reservation row, the hit wrote nothing.

Checked rather than assumed: the three feeds still return 6, 11 and 10 rows
after the schema change; real translations into Chinese, Japanese, Russian and
Korean came back with structure and red-flag arrays intact; the news feed was
pre-generated in every new language so switching language is instant.

No right-to-left language shipped. Arabic and Urdu belong on this list, and the
layout still uses physical direction classes that would mirror incorrectly, so
adding them would produce a broken page rather than a translated one. Card
backs also remain English in every language. Both gaps are recorded in PLAN.md
and README.md rather than left for a reader to find.

### 2026-09-21 - a translated headline over an English lesson

Picking a language changed the tabs and the card headline and left everything
else in English: the lesson behind the flip, the course guide, the job posting,
and every label around them. Reported as working in the previous entry, which
was wrong - the dictionary only ever covered the header and the accessibility
panel, about a third of the strings a reader actually sees.

Two causes, and only one of them cost anything. The backs were already being
translated: one cached call returns title, summary, red flags, the course or
job back and the whole drill, and the card component was reading two of those
fields and discarding the rest. The translated lesson text had been sitting in
the cache since the pre-generation run. Reading it costs nothing.

The labels were hardcoded in the components - the flip prompt on every card
front, the section headings, the quiz feedback, the ask form, the outbound link
text. Thirty-two strings extracted into the dictionary across all eleven
languages. The flip label constants now hold dictionary keys instead of English.

Translating the quiz brings a correctness constraint worth writing down.
Answers are graded on the server from the drill id and the index the reader
picked, and the correct index never reaches the browser, so array order is the
only thing holding the quiz together. A reordered choices array would tell a
reader they misread a scam they had actually spotted - a worse failure than an
untranslated one. The prompt now states the constraint, and the component
refuses translated choices whose count does not match, falling back to English.

Checked across all sixty cached news translations: no count mismatches, and
order confirmed position-for-position by hand in Japanese, Russian and French.
Three feeds still return 6, 11 and 10 rows.

The general lesson: partial translation is worse than none, because a reader
cannot tell which English is deliberate and which is broken.

### 2026-09-21 - a pre-production audit, and the outage it found

Audited the whole app against the live deployment before launch: secrets,
headers, injection, input validation, abuse, errors, performance,
accessibility, SEO and dependencies. Findings and fixes are in AUDIT.md.

It found Ask FlipSec already down in production, unreported. Three reserve
functions each counted EVERY row in the shared usage table and compared it to
their own ceiling, so the budgets were never independent. A pre-generation run
of 210 translations filled the assistant's ceiling of 160 and blocked it for
every visitor, while the speech budget read the same rows against 300 and kept
passing. Nothing was under attack. A limit was counting work it was not
limiting. Budgets now count only their own kinds, through two additive indexes.

The sign-up endpoint was a public write with no rate limit and no consent step,
so anyone could put a stranger's address on a daily mailing list. A sign-up now
records an unconfirmed row and mails that address a link; nothing is sent until
the link is pressed. Both mail routes draw a button on GET and act on POST,
because Outlook, Proofpoint and Gmail fetch links in mail before a person sees
them - which already meant a scanner could unsubscribe a real reader.

Also shipped: an error boundary, where one render error had shown a blank page;
a clamp on a public query whose size the caller chose; a cap on drill answers; a
form-control border that meets the 3:1 WCAG 2.2 requirement instead of 1.31:1; a
Privacy page written from the schema; Open Graph tags and a real 1200x630 card,
where a shared link had rendered as a bare URL; robots.txt and sitemap.xml.

Clean on inspection: no secrets in source, git history or the bundle; no
sourcemaps; no server SDKs in the client bundle; zero XSS sinks; 0 npm audit
vulnerabilities; every text contrast pair passing.

Two findings stay open on purpose. Security headers cannot be set from the
repository - static hosting serves fixed headers, so a CSP belongs in the CDN,
and one cannot be verified without a browser while a wrong connect-src takes
the whole app down. URL routing stays unbuilt, so the site has one indexable
URL. Both are written down rather than quietly left.

Verified against production after every change: three feeds still returning 6,
11 and 10.

### 2026-09-21 - the first real sign-up, and what it broke

Tested the new double opt-in flow with a real mailbox for the first time. It
worked, and it surfaced four things that reading the code had not.

An address that is already confirmed is sent no second confirmation, by design
- but the form still said "check your email", so a returning reader waits for
mail that never arrives. Signing up from the news, learn and jobs tabs sent
three identical confirmations, which is mail amplification through the very
form double opt-in exists to protect. One address is one subscription, the
token is an HMAC of the address alone, and the message already in the inbox
confirms whatever feeds the reader ends up asking for, so the extra copies were
never needed.

The bigger change came out of asking why the three emails looked the same. The
sign-up box can only guess which feeds someone wants from whichever tab they
were on. The confirm page is now where that is decided: three checkboxes,
already ticked for what was asked for, and what the reader submits replaces the
guess. That also makes the consent mean something rather than merely exist.

Nothing ticked is a real answer and it means no. A valid signature for an
address no longer in the table now says so instead of reporting success.

Also added, because mail from a domain with no sending history goes to spam
more often than not: the success message names the spam and junk folders, the
sender, the exact subject line, and that marking it as not spam helps tomorrow's
email arrive. That is a mitigation. SPF, DKIM and DMARC are the actual fix and
remain unverified.

Corrected a claim in the README rather than leaving it: emailed replies are
graded and the result is stored, but nothing is sent back to the reader.

### 2026-09-21 - a lesson the app writes itself

AI Sec Learn carried links to other people's guides. It now also carries
lessons written here, and the first is interactive: a reader picks one of three
emails, presses Summarise, and watches an AI assistant obey an instruction
buried in the message instead of doing what they asked. A defences toggle shows
it resisting. Prompt injection, learned by doing it.

This started as a question about widening the crawl, and checking the
candidates properly changed the answer. Google SAIF has no per-risk pages -
risks/index returns 404. NIST has the same shape. MITRE ATLAS, the best fit in
existence for this feed, serves a 3.7 KB JavaScript shell. Scamwatch has AI in
its headlines and no licence findable across four URLs. FTC and SEC return 403
on robots.txt itself. Good AI security material is not published as a blog
index, so a feed that can only link out is limited by what others happen to
publish in a crawlable shape.

An authored card removes every constraint that shaped the rest of the app: no
robots.txt, no crawl-delay, no licence, no gate. What remains is that nothing
checks it but the person who wrote it.

The assistant in the demo is scripted, and the interface says so. A real model
would depend on its own mood, cost a call, share Ask FlipSec's hourly budget,
fail offline, and give a reader a free-text box that reaches a model. The
behaviour is real; the demonstration is fixed, like a flight simulator.

The request also asked for voice changer and face changer lessons. Those ship
as demonstrations or not at all - a reader can experience prompt injection
because nothing they do leaves the page, and on an app teaching people to
recognise impersonation, shipping impersonation tools would be indefensible.

Learn went from 11 cards to 12. News and Jobs unchanged at 6 and 10, and the
11 crawled guides still render the guide back.

### 2026-09-21 - four lessons, and putting them where they can be found

The prompt injection lesson shipped behind a flip, on card one of twelve,
below a sign-up box that had just grown taller. The person who asked for it
could not find it, which is the only usability test that counts.

All four interactive lessons now sit on the Ask FlipSec page as well as in the
feed, one open at a time. That is where they belong on the merits too: a reader
is there because they brought something suspicious, so the lessons about how
they are being fooled go directly underneath. One at a time because four
interactive blocks stacked would bury the conversation they came for.

The three new ones were chosen for the reader this app is written for, ordered
by how likely they are to meet the thing rather than by how interesting the
attack is.

The voice on the phone comes first, because the grandparent who gets a call in
a voice they know is the person losing the most right now. It demonstrates
without cloning anyone - the same generic voice the app already uses to read
cards, saying what a scammer would say - and ends on the two things that still
work: call back on a number you already have, and agree a family word before
anything is wrong.

Spot the scam is the app's founding premise made checkable: five messages in
clean English, three of them scams. Bad spelling was real advice about a real
tell, and that tell is gone.

Confidently wrong asks the reader to pick the invented AI answer out of three,
and all three are invented. That is the only honest way to teach that
confidence carries no information; a demo where the fake was findable would
teach the opposite of the truth.

Learn went from 14 to 17. News and Jobs unchanged at 8 and 10. A registry now
holds the one list of lessons, the way TABS holds the one list of feeds.

### 2026-09-21 - translate on write, not on read

The feed had translated and untranslated cards in the same list. Measured:
six of eight news cards had Japanese, two did not, and none of the four
authored lesson cards did.

Nothing was broken. Translation happened lazily, on the first reader who asked
for a language, and the feed only ever looked complete because of a one-off
warm-up run. Every card published after it - by the six-hourly cron, or by
seeding a lesson - stayed English until somebody waited through a model call.
That reader also pays the latency and can hit the hourly cap.

Translation now happens at publish time, scheduled from every point a story
becomes published. A card is in all ten languages before anyone sees it. The
lazy path stays as a fallback.

The economics are the argument: publishing is rare and bounded, a handful of
cards per crawl at ten small calls each. Readers are neither, and making the
first reader in each language pay for everybody is the wrong way round.

Also added: a query that answers "is the feed fully translated" without
reading every card by hand, and a staggered backfill for anything published
before this existed. Both safe to re-run.

After the backfill: 35 published stories, ten languages, zero gaps, verified
language by language.

### 2026-09-21 - the daily email kept a promise it had been making

Every daily drill ends "just hit reply and tell me which one, in your own
words. I will tell you how you did." Replies arrived, the webhook verified
them, the model graded them, the verdict was written to the attempt - and
nothing was ever sent back. There were graded rows in the database no human
had seen. Every other gap in this app was a missing feature; this one told a
reader something would happen and then did not.

The grade now goes back: whether they got it, the model's own words on why,
the strongest sign in the message, and the explanation. Plain text, short,
read on a phone by somebody who is not sure they got it right. A wrong answer
is told plainly and then explained, never scolded, because getting a scam
drill wrong is exactly the reader this is for.

Closing the loop turned an existing tidiness rule into a safety one. Our reply
lands in their inbox, so an out-of-office answering it would arrive back here
as another reply, be graded, and be answered again - a mail loop spending an
OpenAI call every turn. saveReply now refuses a second answer to the same
drill, the same rule the web answer already followed.

Tested end to end against production with a reserved .invalid address so no
real mailbox was touched: the first reply graded correctly and attempted the
send, the second was refused with one attempt row on file, and an address with
no drill to grade against still fails closed. Test subscriber removed, two real
subscribers untouched, feeds unchanged at 8, 17 and 10.

### 2026-09-21 - a cron that achieves nothing now says so

Nothing watched the crons. AUDIT.md carried it as an open item, and the
assumption behind it was wrong in an interesting way: the worry was a cron
that crashes, and the real problem is a cron that succeeds.

crawlSources, crawlJobs and sendDailyDrill each catch their own per-source,
per-article and per-subscriber failures and return counts. None of them throws
when a run produces nothing, so Convex records a successful execution and the
dashboard shows green. A crawl that quietly stopped matching an index page
looks exactly like a crawl that found nothing new, and would read as healthy
for days.

It demonstrated itself for free while setting up a second machine. A local
deployment with no API keys ran the job crawler, which logged
"greenhouse: shortlisted 25, queued 25" - a clean success - while every single
downstream job threw on the missing key. The cron reported healthy with nothing
to show for it.

Each run now records what it achieved, and health:status reports the last run
of every cron in one call.

The judgement is which number to watch. ok comes from what a run FOUND, never
from what it saved: saveRawStory drops anything already seen, so saving nothing
is the normal outcome of most six-hourly runs. Alerting on that would cry wolf
four times a day and teach whoever reads it to ignore the signal. Finding
nothing is the real fault - it means an index page stopped parsing.

A run that throws records nothing on purpose. Convex already logs it and the
job's last row stops advancing, so staleness covers that case. Two failure
modes, two signals, no overlap.

This is detection and not notification. Nothing pages anybody. It turns "is
something broken?" from an archaeology exercise across the log into one
command, and AUDIT.md says exactly that rather than claiming more.

Deployed to production. Feeds unchanged at 8, 17 and 10 either side.

### 2026-09-21 - the translator ate an identifier

Reported by the owner as "it does not translate the whole thing". Two faults
with nothing in common except where they surfaced.

back.demo holds the key of an interactive lesson - prompt-injection,
voice-clone - and demoRegistry matches it exactly. storySource sent the whole
back object to the translator, so the key went with it, and the model did what
it was asked. prompt-injection came back as insercion-de-prompt in Spanish and
as the Chinese for prompt injection in Chinese.

findDemo then matched nothing and the card fell through to CourseBack, which
is the designed fallback for an unrecognised key and exactly the wrong outcome
here: an authored back carries a demo key and nothing else. No whatYouLearn,
no whoItIsFor, no firstStep. The reader got a heading, an "Open guide" button
and a back link. Four interactive lessons, ten languages, since the day they
shipped.

Nothing reported it because nothing could. The fallback is silent by design,
the English feed was perfect, and localizationData.untranslated returned an
empty list for all ten languages - the rows existed and were complete. They
were complete and wrong, which no count can see. Measuring coverage is not
measuring correctness.

Fixed on both sides, and the order mattered. Post.tsx now reads the key from
the untranslated story.back, which repairs every row already cached with a
corrupted key - no re-translation, no model calls, no backfill. storySource
strips demo before the model sees it, so nothing pays to corrupt a value
nobody should read from there.

Verified before deploying, by replaying the old and the new client logic over
all forty card-and-language combinations against the real cached translations
in production: 3 of 40 rendered the lesson before, 40 of 40 after. The three
that passed were Filipino, which borrows enough English that the model left
three of the four keys alone.

The second fault was smaller and older. Illusion.tsx printed "What you saw"
and "What was real" as literals, so translated pairs sat under English
headings - on the news card, which is the demo. Section 22 had already
recorded that the thirty-odd hardcoded strings were extracted. This was the
one that was missed, and a grep of the card components for JSX text finds it
in a second. That grep is the check now, rather than anyone's memory.

The general rule went into CLAUDE.md: a translated card must never be the
source of an identifier. Translation is for what a reader reads; anything the
code matches on comes from the original row.

Still open and written down rather than quietly left: the four demo components
are themselves English-only. Fixing the key brings the lessons back, and their
body text is still English in every language.

### 2026-09-21 - English is a language, so it says so

The question was whether the untranslated interactive lessons could be left to
the browser's own translator, or removed. Neither, and chasing it turned a
translation gap into an accessibility finding.

html lang already follows the reader's choice. So a reader on Spanish got
lang="es" wrapped around Home, About, Privacy, the sign-up form and all four
interactive lessons, every one of which is still written in English. English
text, declared as Spanish.

Invisible to a sighted reader. For somebody on a screen reader it is close to
unreadable - the reader switches to a Spanish voice and pronounces English
words with Spanish phonetics. WCAG 2.2 SC 3.1.2, Language of Parts, failing
across most of the app's chrome rather than in one corner.

Marking those regions lang="en" fixes it and answers the original question on
the way: a browser's translator will not offer to translate a section it has
been told is already in the target language. The attribute that makes a screen
reader pronounce English correctly is the same one that makes Chrome offer to
translate it. One change, both results.

ReadAloudButton declares the reader's language back, since every string it
renders comes from the dictionary and it sits inside those English regions -
the same fault pointing the other way.

The demo faces also carry a visible line, from the dictionary and so in the
reader's own language, saying the lesson is in English. A reader who meets an
English lesson should be told rather than left to conclude the app is broken.
Removing the lessons was the other option and was the wrong one: they are the
only thing on AI Sec Learn that is ours rather than a link to somebody else's.

Also closed: the Accessibility panel was 288px wide and anchored right, with
nothing to spare at a 320px viewport. It now carries a max-width holding a
16px gutter at any width. The compiled rule was checked in the built CSS
rather than assumed, which this project has been caught by before.

None of this is translation. The four demos are still English. What changed is
that the app now tells the truth about which language each part of it is in,
which is what both a screen reader and a translator need before either can do
anything sensible.

### 2026-09-21 - the inbox is the second front door

The daily drill has always ended with "just hit reply and tell me which one,
in your own words". Reply with an answer and you got a grade. Reply with a
question and you got nothing, and so did anyone who wrote back to the grade.
The invitation was real and the door was half open.

A reply that is not a fresh drill answer now goes to Ask FlipSec - the same
assistant and the same instructions the site uses - and the answer threads back
into the conversation the reader is already in. The people these scams take the
most from are older and far likelier to be in their mail than on a site they
visited once, and mail is where the suspicious message already is.

Getting the grade to thread came first, and took three attempts. Each time the
loop was reported broken it had actually worked: matched to the right drill,
graded, delivered - to a different thread, because sendGrade called
messages/send, which always makes a new message with its own subject.

The first fix read the incoming message id from the webhook and replied to it.
Deployed, correct, and it did nothing: the payload did not carry that field
under the name the docs give, and a missing id falls back to a new message on
purpose so a grade is never lost. Silent correctness is the hardest bug to see.
Three pieces of evidence pinned it - a probe proved the new code was live, the
logs held no send error, and AgentMail's own thread still ended with the
reader's reply.

The fix that worked stopped asking the payload for anything. sentDrills already
holds the id of the drill we sent; AgentMail returned it from its own send
endpoint and the reply had just been matched against it, which is the same
identifier space the reply endpoint takes in its path. Prefer an identifier you
have watched work over one a document promises.

Three guards, and the third is the interesting one. Only confirmed subscribers
are answered, because from is forgeable and an address that answers strangers
with model calls is an open door onto the bill. emailAsk is its own rate-limit
kind at five per reader per hour, so it cannot drain the site's assistant or be
drained by it. And the inbound route now refuses automatic mail by RFC 3834
headers before anything is written - the drill path was safe from an
auto-responder only because of one-graded-answer-per-drill, and a question has
no such natural end, so our answer provoking their auto-reply provoking our
answer would run all night at a model call a turn. The rate limit is the
backstop; the header check is the fence.

Not done yet: the email assistant cannot see an attachment, and a forwarded
screenshot of a suspicious text is exactly what someone would send.

### 2026-09-21 - the loop, closed and watched

The email loop has been in this log as working since step 66 and had never
once been watched from a real mailbox. Tonight it was, and it took four goes,
each of which looked like a broken pipeline and was not.

The first blamed deliverability. A grade was accepted by AgentMail with an SES
message id and never seen, and with SPF, DKIM and DMARC unverified that was an
easy story to believe. It was wrong: AgentMail's own dashboard showed the
message delivered, and all four bounces on the account were to .invalid audit
addresses rather than to any real inbox.

The second was real. sendGrade called messages/send, which always creates a new
message with its own subject, so the grade arrived in a separate conversation
while the reader watched the one they had replied in. Delivered every time, in
the wrong place. The daily mail says "hit reply and I will tell you how you
did", and the answer was landing where nobody was looking.

The third was a fix that did nothing. It read the incoming message id from the
webhook and replied to it, and the payload did not carry that field under the
name the docs give - so it fell back to a new message, by design, silently.
Replaced with an id we already hold: sentDrills stores the id of the drill we
sent, AgentMail returned it from its own send endpoint, and the reply had just
been matched against it. Prefer an identifier you have watched work over one a
document promises.

The fourth was the one worth writing down. replyToMessageId crosses five
scheduled functions and four were wired; gradeReply took the argument and never
passed it on. Nothing failed, because a grade with no anchor is supposed to go
out as its own message rather than not go out at all - clean logs, passing
tests, mail arriving in the wrong thread. What found it was a difference rather
than an error: emailed questions threaded and grades did not, and the question
path is exactly the hop that skips gradeReply.

Verified on production against a real mailbox, with a fresh subscriber each
round so the one-answer-per-drill guard could not mask the result. Drill
delivered. Reply matched to the right drill by in_reply_to. Graded correct.
Grade threaded back under the reader's own message in 1.5 seconds. Then a
follow-up question answered in that same thread, with the previous turn
remembered.

Send, receive, verify, grade, reply, and answer. The tagline says FlipSec
brings the practice back to the inbox, and as of tonight that is a thing you
can watch happen rather than a thing the code implies.

Still not proven: delivery to a cold mailbox. Every address tested had already
received mail from this sender, and SPF, DKIM and DMARC are unverified on the
sending domain. That is infrastructure and it is recorded as item 8, not
claimed as done.

### 2026-09-21 - say it before the sign-up, not only after

FlipSec.ai sends from a domain with no sending history, and SPF, DKIM and
DMARC cannot be set up without owning one. The owner has deferred buying a
domain until after judging, which is a reasonable call and it means the fix is
simply unavailable. So the mitigation is honesty, moved to the moment it is
useful.

The success screen and the confirm page already named the spam and junk
folders. The sign-up form did not, which is the wrong way round: a reader
decides whether to trust the box before they submit it, and a reader who
cannot find the confirmation afterwards has no way to tell that from a site
that is simply broken.

Also wired the sign-up help text to aria-describedby. It was being shown and
never announced, so a screen reader user got an email input and nothing about
what happens to the address or where the mail lands - which is exactly the
reader the warning is for. AUDIT item 8 now records the domain as the blocker
rather than listing the DNS records as merely outstanding.

### 2026-09-21 - measured the translation instead of arguing about it

Reported as: News translates fully, Learn and Jobs do not. The data said
otherwise - a Learn card's cached Spanish row carried a fully translated title,
summary and back - so the disagreement was about what reaches the screen, and
the only way to settle that was to look at the screen.

Drove the live site with headless Chrome, switched to Spanish, and read the
front of every feed and then the back of two cards in each.

Fronts: all three feeds translated, 8, 17 and 10 cards, every one carrying the
"translated by AI" line. Jobs backs translated in full. Crawled Learn guides
translated in full. So the report was not reproducible as stated.

What was real was two things the report had run together.

The four authored lessons are the NEWEST cards in Learn, so they sit at the top
of that feed and are the first thing anybody flips. Their backs are English by
design and carry a line saying so, which is a mitigation rather than a fix. A
reader who flips the top card of Learn and sees English has every reason to
report that Learn does not translate, and they are describing something true
even though the feed beneath is fine.

And a genuine bug, on News, the feed that was said to work. ScamFlow printed
"The setup", "The hook" and "The loss" over every translated lesson. Those
survived the earlier sweep for hardcoded card strings because that sweep looked
for text in JSX and these lived in a data array. label now holds a dictionary
key, the way FLIP_LABEL and BACK_LABEL already did, and the rule in CLAUDE.md
now says to grep for string literals as well as for JSX text - a label one hop
from where it renders is exactly what a text sweep misses.

Swept the rest of the card surface the same way afterwards. One thing left,
deliberately: the three empty-state messages in Feed.tsx are English and only
render when a feed has no cards at all, which has not happened since launch.

The lesson is about method rather than about i18n. Two people can both be
right about a bug and mean different cards. Reading the database proved the
translation existed; driving the browser proved which one the reader was
actually looking at.

### 2026-09-21 - the feed tabs follow you down

Reported plainly: reach the bottom of a feed and there is no way to reach
another one without scrolling all the way back up. True, and on a phone the
scroll back is long.

The tab row is now sticky under the header. The part worth writing down is the
offset. The header is already sticky at top 0, so the tabs have to sit exactly
beneath it, and the obvious version - a fixed pixel top - is wrong three
different ways here: the header WRAPS at narrow widths, and both it and the
tabs grow with browser zoom and with the in-app larger-text preference.
Measured, it is 69px on a desktop and 121px at 320px, so any constant would
have been wrong on one of them.

So useStickyVar publishes both heights as CSS custom properties from a
ResizeObserver, and the tabs stick at var(--header-h).

The second half is the accessibility one and it is easy to miss. A sticky bar
that covers the element you just tabbed to is WCAG 2.2 SC 2.4.11, Focus Not
Obscured, and this bar sits directly over the next card down. Anything scrolled
to or focused now clears the header plus the tabs, which also fixes card
permalinks landing underneath the chrome.

Checked in headless Chrome at 1280, 390 and 320 wide: with the last card of the
feed on screen the tabs are pinned and visible at all three, and no width
gained a horizontal scrollbar. They do scroll away once you are down in the
footer, because a sticky element stops at the bottom of its container and the
footer is outside the feed. That is the right answer rather than a limitation -
you have left the feed.

### 2026-09-21 - what the other two subscriptions were for

Asked what a Learn or Jobs subscription actually does, given the news drill is
the thing you can reply to. Reading the send path to answer turned a product
question into a defect.

pickTodaysCard did take(1) and returned the newest card of that kind, with no
memory of anything. The drill path rotates per reader through lastDrillId.
These two rotated not at all, so every Learn and Jobs subscriber got the SAME
card every morning until the crawler published a newer one - and most crawls
publish nothing, because saveRawStory drops what it has already seen. This
afternoon's crawl found 60 and saved zero. So "until a newer one" is routinely
days, and the subscription was a daily email repeating itself, which is how a
sender earns spam complaints. Worse than not offering it.

Fixed by rotating on a day index rather than by remembering per reader. One
stored id can only alternate between two cards; day % length walks the whole
feed, needs no schema change, gives every subscriber the same card on the same
day, and a rerun of one day's send picks the same card, which is what the
per-day idempotency key already assumed. Seventeen guides now take seventeen
days to come round instead of one guide arriving seventeen times.

The second half was the design question underneath. News is a loop - quiz,
reply, grade, conversation - and the other two were broadcast. But the reply
loop stopped being news-only earlier today: any reply that is not a drill
answer now reaches Ask FlipSec. Those readers could already hold a conversation
and nothing in the mail told them, because only the drill section ever asked
for a reply. Both sections now invite one, and a comment claiming their replies
were logged and dropped was corrected - it had been true that morning.

Deliberately not built: a quiz for Learn or Jobs. It would be redundant in form
and weaker in substance. The news drill tests a skill against a real incident;
a Learn quiz would test whether somebody read a guide, which is comprehension,
and the Voice section says readers are not marked or graded. A job listing has
no right answer to test. One quiz, on the feed where getting it right means
something.

### 2026-09-21 - a demo script for the app that exists

The demo script in PLAN section 12 was written before most of what is now
worth demonstrating. It predated the email loop closing, the eleven languages,
hash routing and the interactive lessons, and one of its beats - filming a
crawl running live, rows appearing in the feed - turned out to be impractical
rather than merely ambitious. Crawls are six-hourly and most runs save nothing,
because saveRawStory drops everything already seen. One run this afternoon
found 60 items and saved zero. Waiting on camera for a live insert is waiting
for something that usually does not happen.

Rewritten against what the app actually does, with the email loop moved to the
centre because it is now the strongest thing here and it is the product
working rather than the plumbing being narrated: reply in your own words, the
grade arrives in the same thread, then ask a follow-up question and Ask FlipSec
answers in that same thread.

The more useful half is new. Section 12a is a pre-flight, and every item in it
cost a working session to learn: pickTodaysDrill is deterministic so a second
test drill the same day is silently dropped; a drill sent before a reset can no
longer be replied to; a Gmail +alias cannot complete the loop; a cold mailbox
may put the first message in spam, which on camera reads as a broken product
rather than an unbought domain. Plus which Learn card to pick for the language
shot - not one of the top four, they are the authored lessons and their backs
are English by design - and to check OS-level reduced motion before recording,
because it turns the flip into a cross-fade and removes the best visual in the
product.

A demo script that does not say what breaks is half a script. This one says.

### 2026-09-21 - a functional sweep, and the assistant arguing with the app

Asked to stop adding and check that everything actually works. Drove every
feature on the live site rather than reading the code for it.

Backend: feeds at 8, 17 and 10; both crawls green with what they found; zero
untranslated stories across all ten languages. Front end: all seven routes
render and an unknown hash reaches the recovery state; cards flip on all three
feeds; the drill offers three choices, is graded on the server and prints the
verdict in words rather than colour; all four interactive lessons render with
live controls; the accessibility panel opens, toggles and persists; the sign-up
form has a real email input with its help text announced. No page errors
anywhere.

Two of the checks failed and both were the TEST, not the app - drill choices
are buttons with aria-pressed rather than radios, and the assistant's submit
button says Ask FlipSec rather than Ask. Worth recording, because a badly
written test reporting a working feature as broken is how somebody ends up
"fixing" something that was fine.

The one real fault could only have been found by asking. Ask FlipSec was
asked how to check whether a text from a bank is real and answered: check for
poor spelling, grammar, or unusual language, legitimate messages from banks
are usually well-written.

That is the advice this app exists to refute. The home page says bad spelling
USED TO BE how you spotted a fake. ScamWritingDemo is a whole lesson built to
dismantle it. The assistant was teaching it back to the reader in the app's
own voice.

The prompt carried a tone, a topic list and safety rules, and never the
product's thesis. A model given only those answers with the internet's median
opinion, and the internet's median opinion on spotting scams is twenty years
old. Nothing was broken - the prompt was incomplete in a way only a real
question could reveal.

It now states the premise and names the tells that hold: unexpected contact,
urgency, secrecy, being steered to a supplied link instead of the app or
number already in hand, demands for money or codes, and a reason why the
person cannot check with anybody. Verified after deploying by asking the same
question: no mention of spelling, and the answer is do not click the link,
open the bank's own app, call the number on the card.

A system prompt has to carry the product's thesis, not only its tone and its
guardrails.


### 2026-09-21 - address the judging risks without inventing evidence

Reconciled the stale status summaries with the newer production-mail evidence.
The current local changes add server-issued anonymous sessions for private
conversations, retire jobs missing from successful employer snapshots, translate
Home and signup into all eleven languages, and provide four shorter localized
practice exercises while preserving the original English demonstrations.
Careers are secondary to the story -> lesson -> practice -> conversation path.

Twenty-eight regression tests pass, including cross-session access rejection,
job retirement without treating network failures as closures, and signup through
the generated confirmation link. Four browser tests pass, including the mobile
landing/signup path in all languages and all four Spanish exercises; the optional
card-fixture test is skipped. No real mail or paid model calls were used in these
tests. USER_TESTING.md is ready for three human sessions and a fresh-mailbox check;
its results are empty because those observations have not happened. No production
deployment was performed in this follow-up. READINESS.md states the exact limits.
