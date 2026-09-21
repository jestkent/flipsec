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
- **Auth:** none
- **AI models:** gpt-4o-mini, gpt-4o-mini-tts
- **Started:** 2026-09-20T17:35:41Z
- **Last updated:** 2026-09-21T06:55:00Z

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
