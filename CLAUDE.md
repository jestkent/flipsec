# FlipSec.ai

An AI security app for ordinary people, built around one move: every card
flips, and the back is what the front does not tell you. Three feeds use it.
AI Sec News carries real stories about AI used against people and flips to a
lesson built from that story. AI Sec Learn carries free guides to attacking and
defending AI and flips to what you will learn and how to start. AI Sec Jobs
carries openings where AI and security meet and flips to what they want and
how to apply.

The reader-facing names are AI Sec News, AI Sec Learn and AI Sec Jobs. The kind
values in the database are still scam, course and job, and stay that way:
migrating every published row for a word on a button is not worth the risk.

The flip is the product. A new feed is a crawler, an OpenAI pass and a back
component; it is never a second flip.

Ask FlipSec is the moment-of-need side of the same product. It is one
conversation for suspicious messages, images, recovery steps, privacy, AI
literacy and basic web app security. `assistant.ts` uses the Convex Agent
component so text questions and answers form a durable thread. Attached images
are temporary model context and are not saved in that thread. The assistant
does not issue a safe/unsafe verdict or claim to detect AI-generated media.
`toolChecks` holds only reader id, kind and time for transactional per-reader
and global rate limits.
The Delete conversation control removes both the Agent thread and its
`assistantThreads` access row; do not turn it into a local-only reset.

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
- AI, crawl and email functions are `internalAction`. Ask FlipSec exposes one
  rate-limited public action and a thread query scoped to the browser reader. The public
  writes are `submitAnswer`, `askAboutStory`, `teachLesson`, `subscribe`. Never make
  `sendTestDrill` public: it would mail any address a caller named.
- **A public function must never take an identifier that names someone else.**
  `attempts.listForUser` was public and took a `userId`. For an emailed reply
  that id is the reader's email address, so anyone could read the free text a
  stranger wrote back to us, and an unknown address returning `[]` confirmed
  who was subscribed. It was deleted. Anything per-person needs a real session,
  not a caller-supplied key.
- **Every hourly cap lives in `convex/rateLimit.ts`, and a budget counts only
  its own kinds.** They used to be three copies counting EVERY row in
  `toolChecks`, whatever wrote it. The table is shared, so the budgets were
  not independent: 210 legitimate translations filled `reserveChat`'s ceiling
  of 160 and took Ask FlipSec offline for every visitor, while `reserveSpeech`
  read the same rows against 300 and kept passing. The per-reader caps were
  worse — one reader translating thirty cards spent their own assistant budget.
  `by_kind_time` and `by_user_kind_time` exist for this. If a feature reports
  an hourly limit with no matching traffic, check `toolChecks` by kind first.
- **Reserve only when the work will actually cost something.**
  `translateStory` reserves AFTER the cache is checked. A hit must stay free
  and unmetered, or a reader switching language on a warm feed spends their
  budget on rows that were already paid for.
- **`subscribers.pending` absent means CONFIRMED.** Anyone can type any
  address into the sign-up box, so a sign-up now records an unconfirmed row and
  mails that address a link; nothing is sent until the link is pressed, which
  puts consent in the mailbox rather than in whoever filled in the form. Every
  row written before that existed is a real reader, so `listActive` filters
  `pending !== true` and never `pending === false`. That distinction is the
  whole safety property — do not tidy it into a boolean with a default.
- **Both mail routes draw a button on GET and act on POST.** Outlook Safe
  Links, Proofpoint and Gmail fetch links in mail before a human sees them. A
  GET that unsubscribed on sight quietly removed real readers, and a GET that
  confirmed on sight would make double opt-in meaningless because the scanner
  would be doing the consenting. `confirmToken` signs `confirm:<address>` and
  `unsubscribeToken` signs the bare address, so neither link can do the
  other's job; `unsubscribeToken` must keep signing the bare address, because
  links in already-delivered mail carry those tokens. The address now reaches
  the hand-built HTML in a hidden field, so `escapeHtml` is not decorative.
- **A public query does not let the caller choose how much we read.**
  `listPublished` clamps `limit` to 1..100. Unbounded, it let anyone force a
  maximum-size read in a loop.
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

## Design system

- Colour lives in `src/index.css`: a raw palette in `:root`, roles beside it
  (`--page`, `--surface`, `--text-strong`), and Tailwind utilities in `@theme`.
  The Tailwind names are prefixed (`navy`, `teal`, `ivory`, `line`) because a
  token named `--color-teal-600` in both `:root` and `@theme` would reference
  itself and silently generate no CSS at all.
- Ivory page, white cards, navy headings, a muted sage green for anything you
  can act on, amber only for genuine highlights, coral only for real errors and
  threats. The green replaced a saturated teal, which read as louder than a
  reading app should.
- Status is never colour alone. Every badge carries its own word, the selected
  tab changes weight as well as rule colour, and the current nav item is
  underlined.
- Shared components live in `src/components/ui.tsx`: Button, LinkButton, Badge,
  Card, Eyebrow, Skeleton, CardSkeleton, EmptyState, ErrorNotice. Reach for one
  before writing another set of padding and radius classes.
- Radii are `rounded-card` (12px) and `rounded-control` (8px). Nothing is a
  pill except a genuine tag. Spacing follows an 8px rhythm.
- One family, Source Sans 3, loaded in `index.html`. Headings are semibold,
  never black. Body copy stays around 65-75 characters.
- The logo lives in `public/brand/`. It is a horizontal lockup that already
  contains the wordmark, so nothing sets "FlipSec.ai" in text beside it. Four
  files: the lockup at 256x64 with a 512x128 @2x, and the mark alone squared
  at 96 and 192 for the favicon and for widths under 640px where the full
  lockup crowds the navigation. Sized by height with `w-auto`, so it cannot be
  stretched, and never recoloured or set on a busy ground. The supplied
  artwork is trimmed to its content box before shipping; the raw file carries
  a wide transparent margin that would otherwise read as broken padding.
- Every control has a visible keyboard focus ring, set once in `index.css` on
  `:focus-visible`. Several had none and relied on a browser default a custom
  background swallowed.
- `border-line` (#d9e2ec) is 1.31:1 on white: correct as the edge of a card,
  and a WCAG 2.2 1.4.11 failure as the only thing showing where an input is.
  `border-field` (#6e879f, 3.73:1 on white, 3.42:1 on ivory) exists for the
  three form controls whose boundary it is and nothing else. Do not move the
  app onto it wholesale — the quieter card line is deliberate. After adding any
  `@theme` token, grep the compiled CSS for the utility: a Tailwind v4 token
  that self-references generates nothing at all and fails silently.
- `ErrorBoundary.tsx` wraps the app in `main.tsx`. Without it one thrown
  render error left a blank white page, which for a screen reader announces
  nothing and for a non-technical reader is indistinguishable from a slow
  connection. It is a class component because that is still the only way to
  catch a render error, and it deliberately offers no reload button: a crash
  that reproduces on mount would loop.
- Privacy is the fifth view in `App.tsx` state, linked from the footer of
  every view and from a sentence under the sign-up box. It is written from the
  schema rather than a template and has to be updated when what is stored
  changes. A README on GitHub is not notice to someone typing their address
  into a form.
- The absolute URLs in `index.html` (canonical, `og:url`, `og:image`,
  `twitter:image`), `public/sitemap.xml` and `public/robots.txt` all name the
  production domain and MOVE TOGETHER. Open Graph does not resolve relative
  paths, which is why they are absolute. The sitemap has one entry because the
  reading views have no URL of their own; listing `/about` would point a
  crawler at a path that serves the same shell.

## UI

- The interface is intentionally calm. The homepage has two hero actions,
  three unboxed feed pathways, a three-step explanation and one latest-story
  card. Do not restore the duplicate technology card grid or add ornamental
  dashboards.
- Firecrawl, OpenAI, Convex and AgentMail appear once in the shared footer with
  one plain-language role each. This is judge-facing evidence that stays quiet
  for readers. Keep detailed architecture in About and the repository docs.
- About owns the short mission and vision statements. Keep each concise; they
  explain purpose and direction rather than acting as marketing slogans.

- Accessibility is a product requirement across every view. Preserve semantic
  headings and landmarks, the skip link, route focus management, the polite
  page announcement, and meaningful document titles.
- Feed navigation is a real ARIA tab set. Left and Right arrows move between
  tabs; Home and End jump to the first and last tab. Do not replace it with
  click-only buttons.
- A card flip moves keyboard focus to the flip control on the newly visible
  face. The hidden face stays both `inert` and `aria-hidden`. Never add a focusable
  control to a hidden face or remove that focus handoff.
- Controls have a 44px minimum target and a three-pixel visible focus ring.
  Inline prose links are the only target-size exception. Forms use real labels,
  submit events, `aria-describedby` help, alert/status regions, and text that
  names busy states rather than an ellipsis.
- Never communicate correct, wrong, selected, dangerous or successful states
  through color alone. Quiz choices print "Correct answer" and "Your answer";
  badges always carry text.
- Do not clamp reader content. It must reflow at browser zoom and with the
  larger-text preference. Side-by-side explanatory content stacks before its
  columns become narrow.
- `AccessibilityOptions.tsx` owns the saved larger-text, higher-contrast,
  reduced-motion and color-vision settings. Keep it visible in the main
  navigation rather than returning it to the footer. The color presets remap
  the palette; labels, icons, borders and text must still carry every meaning.
  CSS also honors `prefers-reduced-motion`,
  `prefers-contrast` and forced-colors. Any new animation needs both system and
  in-app reduced-motion behavior.
- `ReadAloudButton.tsx` tries the natural voice first (`localization.speak`,
  `gpt-4o-mini-tts`), and only falls back to the browser's own speech
  synthesis on a failure, a rate limit, or text over the server's 4,096
  character cap. The control renders unconditionally, since the primary path
  does not depend on browser speech support at all. A module-level
  `HTMLAudioElement`, alongside the existing `activeSpeechId` broadcast, keeps
  natural-voice playback to one at a time the same way `speechSynthesis`
  already is. The "AI-generated voice" line only shows while natural audio is
  the one actually playing — OpenAI's usage policy for synthetic speech
  requires that disclosure. Generated clips are cached in Convex storage by a
  hash of `language:text`, so the same clip is never paid for twice.
- The app reads in eleven languages: English, Spanish, Simplified Chinese,
  Hindi, Filipino, Vietnamese, Russian, Japanese, Korean, Brazilian Portuguese
  and French. The list lives in exactly two places and nowhere else — the
  `LANGUAGES` array in `src/localization.tsx` (endonym, `<html lang>` tag,
  browser-speech locale) and the two validators in `convex/languages.ts`, which
  the schema, the translate action and both caches import. Adding a language is
  one entry in each plus a dictionary; adding a literal to a `v.union` is an
  additive schema change and existing rows keep validating.
- Write the language's own name in the menu and never translate it. "Español"
  stays "Español" in the Japanese dictionary, because a reader who cannot read
  English still has to find their own row. Each `<option>` carries its own
  `lang` so a screen reader pronounces it with the right voice.
- The literals in `convex/languages.ts` are spelled out rather than spread from
  an array. `v.union(...codes.map(v.literal))` infers `string` instead of the
  exact union, which silently turns `args.language` into a plain string.
- No right-to-left language ships yet. Arabic, Hebrew, Urdu and Farsi need the
  layout moved off physical direction classes (`right-3`, `pl-2`, `ml-auto`)
  onto logical ones before they would read correctly. Adding one to the list
  without that work produces a mirrored-looking page, not a translated one.
- Story translation (`localization.translateStory`, cached in
  `storyTranslations`) covers the whole card: title, summary, red flags, the
  course or job `back`, and the drill. One call already returned all of it —
  `Post.tsx` was reading only the title and summary and discarding the rest,
  which left a translated headline sitting over an English lesson. Translating
  a back costs nothing extra; it is the same cached row.
- `showOriginal` has to return the **whole** card to English, back included.
  A reader who asked for the original and still gets a translated lesson has
  been given half a control.
- The quiz is graded server side from the drill id and the index the reader
  picked, and the correct index is never sent to the browser. That makes array
  **order** the one thing a translation must preserve: a reordered `choices`
  array marks a correct answer wrong. The prompt says so explicitly, and
  `Post.tsx` refuses translated choices unless the count still matches,
  falling back to English rather than risking a mis-graded quiz.
- Every string a reader sees on a card lives in the dictionary, including the
  flip labels. `FLIP_LABEL` and `BACK_LABEL` hold dictionary **keys**, not
  text. A hardcoded English label on a translated card is the bug that made
  the whole feature look broken: the tabs changed language and the cards did
  not. If a new string is added to a card, add the key at the same time.
- `translateStory` reserves a rate-limit slot **only on a cache miss**, after
  `storySource` reports no cached row. A hit costs nothing and must never
  consume a slot, or a reader switching language on a warm feed burns their
  hourly budget on rows that were already paid for. It is a public action that
  calls a paid model, so it needs the cap for the same reason `questions` does;
  the cache bounds the lifetime spend, but not the concurrent spend.
- New-window links say so to screen readers. Decorative art and source icons
  use empty alternatives or `aria-hidden`; submitted image previews name the
  attached file.

- The flip is 460ms and made of four parts, not one. The rotation overshoots
  slightly and settles (`--flip-ease`); the card scales to 0.955 at 48% and
  back, which is what reads as depth; the shadow deepens at the same instant;
  and the height travels with the turn rather than jumping at the midpoint. It
  used to jump, which was invisible on the card but moved the whole feed below
  it in one frame.
- The lift is on `.post` and the rotation on `.post-inner` because both want
  the transform property and only one can have it.
- `FLIP_MS` in Post.tsx and `--flip-duration` in index.css have to agree, or
  will-change outlives the movement or is stripped mid-turn.
- The height transition waits for the first measurement (`.sized`). Without
  that, every card animates up from zero on first paint, because both faces
  are absolutely positioned and the container starts with no height.
- Reduced motion turns off the rotation, the lift and the travelling height,
  and keeps only a cross-fade. That cross-fade is declared after the blanket
  reset and marked important, or the reset flattens it too. Locking to the taller face, as PLAN.md section 7
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
- One control, one job, one name. The card back has exactly two exits and they
  are deliberately different: the round badge in the corner, which is the same
  control in the same place as the front and is for a reader who turned the
  card by accident; and the text link at the end of the reading, for a reader
  who has finished and is already down there. They briefly carried the same
  words, one under the other, which is not two affordances but one mistake.
- A header action must offer something the navigation does not. A "Start
  reading" button sat beside a "Feeds" link and both went to the same view,
  so the reader had to work out which was real. The primary call to action
  lives on the home page; the header is navigation only.
- The flip is a round badge over the artwork, top right, on both faces, plus a
  quiet labelled line at the foot of the card FRONT only. A full-width solid button in its
  place made every card look like a landing page. The badge has no printed
  label, so its aria-label carries the meaning.
- Never use a character as an interface icon unless the font has it. The flip
  icon was U+293E, which Source Sans 3 does not contain, so it rendered as an
  empty box. Icons are shipped SVG shapes.
- Only the news kind loads a drill. Edu and jobs carry their whole back in
  `story.back`, so they never open that subscription.
- Feed order is the exported `TABS` array in `App.tsx`; nothing else holds a
  list of kinds. Each tab mounts its own `Feed` via `key`, so switching tabs
  does not inherit the previous tab's flipped cards and measured heights.
- Body copy is 16px (`text-base`), never 14px, and muted text stops at
  `neutral-500` on white. Readers include older people, so small grey type is a
  correctness problem here, not a taste one.
- Four views are held in `App.tsx` state: home, feed, Ask FlipSec and About. A router
  still does not earn itself.

## Voice

Plain language at a 7th grade reading level. Sentence case, plain verbs, no
jargon. If a 7th grader would not say the word, it does not go on the post.

The reading level is not the audience. This is written for anyone who is not a
security expert, and the people these scams take the most from are usually older
and were never the reader the usual advice imagined. Plain words serve both. Keep
school vocabulary out of the app: readers are not marked, graded, or set
homework.

## Audit

`AUDIT.md` records the pre-production audit, what was fixed and where, what
is deliberately still open, and the manual checks that cannot be made from
the repository. Read it before changing anything in the list above: it says
which behaviours are load-bearing and what breaks if they are "tidied".

Two findings are open on purpose. Security headers (no CSP, HSTS or frame
protection) cannot be set from the repository — `@convex-dev/static-hosting`
serves fixed headers — so they belong in a Cloudflare Transform Rule, and
AUDIT.md carries a starter policy whose `wss:`, `media-src` and `img-src`
lines are the ones that break the app if got wrong. URL routing stays unbuilt,
so the site has one indexable URL and returns 200 for unknown paths.

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
