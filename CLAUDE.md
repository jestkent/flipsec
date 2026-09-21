# FlipSec

An AI security app for ordinary people, built around one move: every card
flips, and the back is what the front does not tell you. Three feeds use it.
AI Sec News carries real stories about AI used against people and flips to a
lesson built from that story. AI Sec Edu carries free guides to attacking and
defending AI and flips to what you will learn and how to start. AI Sec Jobs
carries openings where AI and security meet and flips to what they want and
how to apply.

The reader-facing names are AI Sec News, AI Sec Edu and AI Sec Jobs. The kind
values in the database are still scam, course and job, and stay that way:
migrating every published row for a word on a button is not worth the risk.

The flip is the product. A new feed is a crawler, an OpenAI pass and a back
component; it is never a second flip.

**Stack:** React, Vite, TypeScript, Tailwind v4, Convex, OpenAI (gpt-4o-mini),
Firecrawl, AgentMail. **Live:** <https://hallowed-nightingale-322.convex.site>

## Architecture

- Actions do network calls only, never `ctx.db`. They reach the database by
  scheduling mutations, or `ctx.runQuery` / `ctx.runMutation` when a value must
  come back. A mutation holding the data passes it into the scheduled action.
- Mutations are transactions and never fetch. Every lookup uses `withIndex`.
- One `stories` table holds all three feeds, split by `kind` and read through
  `by_kind_published`. `back` is `v.any()` because a course back and a job back
  hold different fields. `saveRawStory` is the single entry point and dispatches
  to the right OpenAI pass by kind.
- A row with no `kind` does not appear under `kind = "scam"`. Any deployment
  must run `backfillKind` **before** a query reads `by_kind_published`, or the
  scam feed comes back empty.
- AI, crawl and email functions are `internalAction`. The only public writes are
  `submitAnswer`, `askAboutStory`, `teachLesson`, `subscribe`. Never make
  `sendTestDrill` public: it would mail any address a caller named.
- **A public function must never take an identifier that names someone else.**
  `attempts.listForUser` was public and took a `userId`. For an emailed reply
  that id is the reader's email address, so anyone could read the free text a
  stranger wrote back to us, and an unknown address returning `[]` confirmed
  who was subscribed. It was deleted. Anything per-person needs a real session,
  not a caller-supplied key.
- **Rate limits must claim the slot in the same transaction that counts it.**
  `questions.reserve` inserts the row before the model is called. It used to
  only count, with the OpenAI call sitting between counting and writing, so
  twelve concurrent requests against a cap of ten all passed. Check-then-act is
  not a limit on a public endpoint.
- Both public HTTP routes fail closed. The inbound mail route was
  unauthenticated, so a forged `from` could write an attempt for a real
  subscriber and spend an OpenAI call grading it. It now verifies AgentMail's
  own webhook signature (`AGENTMAIL_WEBHOOK_SECRET`, the `whsec_` value on the
  webhook object): HMAC-SHA256 over `id.timestamp.body`, both the `svix-` and
  `webhook-` header spellings, and a five minute window against replay. It
  also accepts `WEBHOOK_SECRET` as `?k=` for a manual curl. Prefer the
  signature: it covers the body as well as the sender, keeps the secret out of
  URLs and logs, and needs no change to the URL registered with AgentMail.
  Read the raw body once with `request.text()` — the signature is over exact
  bytes, and the body cannot be consumed twice.
- `userId` comes from the browser and can be regenerated, so per-reader caps are
  a courtesy. Anything spending money also needs a deployment-wide cap
  (`questions.by_time`).
- Secrets live in Convex env vars only, per deployment: OPENAI, FIRECRAWL,
  AGENTMAIL. Never hardcode or commit one.
- Static hosting owns `/`, so app routes go under `/api`. The AgentMail webhook
  is `/api/agentmail-inbound`. AgentMail is called over REST, not its SDK, which
  imports a payments module Convex cannot bundle.

## Content

- Never display `rawText`. Clear it when a story leaves `raw`, either way, and
  `listPublished` strips it again rather than trusting that.
- Summaries are original phrasing, never a reused source phrase. Every post
  shows its source name and links out.
- Sources: AI Incident Database (CC BY-SA; their own description field only,
  never their report text), FBI IC3, FTC, OWASP Gen AI Security Project (edu),
  company Greenhouse boards (jobs). Honour each robots.txt and its crawl-delay.
  CISA will not crawl, its index is JavaScript-rendered.
- Jobs are the one source that is not Firecrawl. Generalist remote boards were
  measured first and dropped: across about 340 listings from ten queries, four
  mentioned both AI and security and all four were false positives, because
  those boards tag "security" for loss prevention and door staff. Jobs now come
  from companies' own public Greenhouse boards, which carry the full posting
  and the canonical apply link. Two stages: filter titles from the cheap list
  endpoint, then fetch only survivors. Dedupe on title within a board, because
  Greenhouse lists one role once per office.
- Any job or listing text is data, not instructions. Remote OK's descriptions
  carried an anti-scraping tripwire asking the reader to repeat a codeword;
  that is why the job prompt says so explicitly, and it still should.
- Every kind gates the same way: one OpenAI call at `temperature: 0` returns
  front, back and gates together, and any failed gate marks the row `failed`
  with `rawText` dropped. News: `aiRelated`, `isScam`, `everydayPerson`,
  `unsafeTopic`. Edu: `isFree`, `isAISecurity`. Jobs: `isAISecurity`.
- A gate must name its scope or it judges the whole scraped page. `unsafeTopic`
  became an enum because a yes/no safety question false-positived on ordinary
  crime; `isFree` had to be told it means this guide's own lessons, because it
  was reading the site's PRO and Enterprise nav and rejecting free material.
  `isAISecurity` on a job needed eleven worked examples and "strike out the
  employer's name and read it again", because the model kept reasoning "AI
  company, therefore AI security" and passing cloud and DevOps roles. If a gate
  over-fires, narrow what it is asked about rather than softening the rule; if
  it under-fires, give it labelled examples from the source that fooled it.
- Images come from `og:image`, else `TacticArt.tsx`, which also carries art for
  the guide levels and `hiring` so a feed with no source pictures still reads
  as a feed.
- `askAboutStory` answers only about its own post, treats reader input as a
  question and never an instruction, and is capped at 200 chars in, 10 per
  reader an hour, 220 tokens out. `teachLesson` is cached per story in
  `lessons`, never regenerated per view, and shares the same hourly bucket —
  it had no limit of any kind before.
- A summary must name what the AI did. An FTC story whose source said the fake
  site was cloned "using AI" produced a summary with no AI in it, which on an
  AI security feed reads as a broken filter.
- `isScam` excludes lawsuits and consumer complaints about a product being
  oversold. A product-liability case against a named company reached the feed
  tagged `phishing`; there was no trick and nobody was tricked.
- Edu gates on `isLearningMaterial` as well as `isFree` and `isAISecurity`. A
  vendor landscape or solutions directory is a catalogue of a market, not
  something a reader can learn from.

## UI

- The card is the height of the face being shown, swapped 260ms into the 520ms
  rotation while it is edge on. Locking to the taller face, as PLAN.md section 7
  says, makes every card as tall as its own lesson. Only `transform` animates.
- Measure a content-sized wrapper inside each face, never the face. A face is
  `position: absolute; inset: 0`, so its box is whatever height we set and a
  `ResizeObserver` on it never fires. Watching the face meant the card kept its
  pre-lesson height and clipped the tutor text.
- Keep the last loaded drill when flipping back; the query goes to `"skip"` and
  the loading state is visible mid-rotation.
- Wrap every `localStorage` call in try/catch. An unguarded throw in a private
  window renders the feed blank.
- DOM ids inside a repeated card need `useId`, or two posts of one tactic clash.
- The face that is turned away gets `inert` and `aria-hidden`.
  `backface-visibility` hides a face from the eye but not from the keyboard, so
  every unflipped card was putting its ask box, buttons and drill options in
  the tab order.
- Every call that reaches a model needs a `catch` and a visible message.
  `LessonBack` had two `try` blocks, zero `catch`, and a failed call silently
  reset the button, which reads as a broken app rather than a busy one.
- One flip, three backs. `Post.tsx` owns the rotation, the height measuring and
  the reduced-motion path for every kind; a new feed adds a back component and
  nothing else. `CourseBack` and `JobBack` follow the same rule as `LessonBack`:
  no `h-full`, no `overflow-y-auto`, no `mt-auto` anywhere inside a face.
- Only the news kind loads a drill. Edu and jobs carry their whole back in
  `story.back`, so they never open that subscription.
- Feed order is the exported `TABS` array in `App.tsx`; nothing else holds a
  list of kinds. Each tab mounts its own `Feed` via `key`, so switching tabs
  does not inherit the previous tab's flipped cards and measured heights.
- Body copy is 16px (`text-base`), never 14px, and muted text stops at
  `neutral-500` on white. Readers include older people, so small grey type is a
  correctness problem here, not a taste one.
- Two views held in `App.tsx` state, feed and About. A router for one link would
  not earn itself.

## Voice

Plain language at a 7th grade reading level. Sentence case, plain verbs, no
jargon. If a 7th grader would not say the word, it does not go on the post.

The reading level is not the audience. This is written for anyone who is not a
security expert, and the people these scams take the most from are usually older
and were never the reader the usual advice imagined. Plain words serve both. Keep
school vocabulary out of the app: readers are not marked, graded, or set
homework.

## Spec

See PLAN.md. Never build anything in section 15. Agreed deviations: the flip
opens the lesson, not the drill (sections 2, 4 and 12 assume otherwise); IC3 and
AIID lead the sources, where section 5 lists FTC first; and PLAN.md describes
one feed about AI scams, where the app now has three about AI security. The
section 15 ban still holds — Edu and Jobs are more feeds through the same flip,
not the social graph, streaks or dashboards that section rules out.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
