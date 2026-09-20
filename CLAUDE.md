# FlipSec

An AI security awareness app for ordinary people. The feed looks like social
media and carries real stories about AI being used against people. Flipping a
post opens a lesson built from that exact story.

**Stack:** React, Vite, TypeScript, Tailwind v4, Convex, OpenAI (gpt-4o-mini),
Firecrawl, AgentMail. **Live:** <https://hallowed-nightingale-322.convex.site>

## Architecture

- Actions do network calls only, never `ctx.db`. They reach the database by
  scheduling mutations, or `ctx.runQuery` / `ctx.runMutation` when a value must
  come back. A mutation holding the data passes it into the scheduled action.
- Mutations are transactions and never fetch. Every lookup uses `withIndex`.
- AI, crawl and email functions are `internalAction`. The only public writes are
  `submitAnswer`, `askAboutStory`, `teachLesson`, `subscribe`. Never make
  `sendTestDrill` public: it would mail any address a caller named.
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
  never their report text), FBI IC3, FTC. Honour each robots.txt and its
  crawl-delay. CISA will not crawl, its index is JavaScript-rendered.
- One OpenAI call judges four gates beside the summary: `aiRelated` (AI must
  really be in it), `isScam` (a trick a reader could spot), `everydayPerson`
  (no token/kit/server/admin vocabulary), `unsafeTopic` (named category, not a
  boolean — a yes/no safety question false-positives on ordinary crime). Any
  failure marks the story `failed`.
- Images come from `og:image`, else `TacticArt.tsx`.
- `askAboutStory` answers only about its own post, treats reader input as a
  question and never an instruction, and is capped at 200 chars in, 10 per
  reader an hour, 220 tokens out. `teachLesson` is cached per story in
  `lessons`; never regenerate per view.

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

## Voice

Plain language at a 7th grade reading level. Sentence case, plain verbs, no
jargon. If a 7th grader would not say the word, it does not go on the post.

## Spec

See PLAN.md. Never build anything in section 15. Agreed deviations: the flip
opens the lesson, not the drill (sections 2, 4 and 12 assume otherwise); and
IC3 and AIID lead the sources, where section 5 lists FTC first.
