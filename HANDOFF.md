# Picking this up on another machine

## Current work - local, not production

Read RELIABILITY.md first and inspect git diff: the reliability update is
uncommitted. Preserve Claude changes through b9eeac7. It adds regression tests,
mail consent and reply matching, bounded feedback retries, complete translation
checks, paginated daily delivery and hash/card navigation. Production has not
been updated. Use newly sent drills after deployment; old mail has no message
mapping. Existing incomplete translations may need the documented backfill.

Run npm test and npm run test:browser as well as build, backend typecheck and
lint. Browser tests use installed Chrome. The configured development target is
local-kent_agan-flipsec; do not infer production from the live URL below.

Written 2026-09-21. If the date below is stale, trust `git log` and the other
docs over this file.

## Setup

```bash
git clone https://github.com/jestkent/flipsec
cd flipsec
npm install
npx convex dev          # log in, link to the EXISTING project, then Ctrl-C
```

`npx convex dev` writes `.env.local` itself. **Do not copy that file between
machines** — it holds the deployment name, and a stale one points the new
machine at the wrong deployment. It contains no API keys.

Every secret lives in Convex env vars per deployment and travels with the
deployment, so the new machine picks them up once it is linked. Nothing needs
pasting anywhere.

```bash
npm run dev             # local, against the dev deployment
npm run build           # tsc -b && vite build. Must pass before any commit.
npm run lint            # oxlint. 6 warnings is the expected baseline.
```

Deploying to production is two commands, in this order:

```bash
npx convex deploy --yes
npx @convex-dev/static-hosting deploy --skip-convex
```

The second needs `--skip-convex` or it prompts, and a prompt in a
non-interactive shell fails the deploy.

## Where things stand

Live: <https://hallowed-nightingale-322.convex.site>

Feeds at last check: **8 news, 17 learn, 10 jobs**. Check them after every
deploy — it is the fastest signal that something broke:

```bash
for k in scam course job; do npx convex run stories:listPublished "{\"kind\":\"$k\"}" --prod | grep -c '"_id"'; done
```

Crons run every six hours and publish new cards on their own, so these numbers
move without anybody touching the code. That is normal.

## Read these, in this order

- **CLAUDE.md** — loads automatically in Claude Code. The rules, and why each
  one exists. Most say what broke when it was not followed.
- **AUDIT.md** — the pre-production audit: what was found, what was fixed,
  what is deliberately still open, and the manual checks nobody can do from
  the repository. Section 3 is the one to read before changing anything,
  because it lists what is load-bearing and what breaks if it is "tidied".
- **PLAN.md** — the spec and the shipped extensions, sections 20 to 26.
  Section 24 is a researched backlog of crawl sources with robots.txt and
  licence already checked.
- **hackathon.md** — the build log, newest entry last.

## The email loop, in one place

Send, receive, verify, grade, reply - and now answer. A reply to the daily
drill is graded if it is this morning's answer and sent to Ask FlipSec if it
is anything else, and either way the response threads back into the reader's
own conversation.

**Verified end to end on production, 2026-09-21**, against a real mailbox:
drill delivered, reply matched to the right drill, graded, grade threaded back
in 1.5 seconds, follow-up question answered in the same thread with context
kept. AUDIT.md section 5b has the evidence and the three rounds of testing it
took. What is still NOT proven is delivery to a cold mailbox - every test went
to an address that had already received mail from this sender, and SPF, DKIM
and DMARC are still unverified.

Testing it has three traps, all of which cost an evening once:

- **`pickTodaysDrill` is deterministic**, so every test drill sent on one day
  carries the same `drillId`. One-graded-answer-per-reader-per-drill then
  drops a second reply from the same address, silently and correctly. Use a
  different mailbox, or `npx convex run subscribers:forget "{email:'...'}"
  --prod`, which deletes the subscriber AND their attempts.
- **A Gmail `+alias` cannot complete the loop.** Mail to
  `you+test@gmail.com` arrives, but Gmail replies from the bare address, so
  the ownership check in `saveReply` correctly refuses it. Use a genuinely
  separate mailbox.
- **Replying to a drill sent before a reset** fails, because its `sentDrills`
  row points at a subscriber id that no longer exists. Always reply to the
  newest drill.

## Still open, on purpose

- **Security headers.** No CSP, HSTS or frame protection. Cannot be set from
  the repository: static hosting serves fixed headers. It cannot be set from a
  Cloudflare dashboard either, which AUDIT.md used to say — `*.convex.site` is
  Convex's zone, not ours, so there is no Transform Rule to add. It is blocked
  behind a custom domain. AUDIT.md section 6 has the reasoning and a starter
  policy, and flags the three lines that break the app if they are wrong.
- **API key rotation.** Deferred by the project owner to do last. AUDIT.md
  section 8 item 1.
- **The sending address is `jestonikent-1696@agentmail.to`**, an inbox name
  AgentMail generated when the account was made. It should read as FlipSec,
  not as a person. Nothing in the code builds it — it is `AGENTMAIL_INBOX_ID`
  read straight from the env vars. To change it: make a new AgentMail inbox
  called something like `flipsec`, then
  `npx convex env set AGENTMAIL_INBOX_ID <new-inbox> --prod`.
  **Deferred on purpose, and not a one-liner.** The webhook has to be
  re-pointed at the new inbox in the same change, and every drill already
  delivered carries reply-to headers for the OLD inbox, so replies to that
  mail would land somewhere nothing is reading them. Do it when no reply is
  in flight, not against a deadline. It looks unpolished; it breaks nothing.
- **SEO and HTTP routing.** Hash links now support view/card sharing and
  browser history locally. The app still has one indexable shell, and unknown
  server paths retain the hosting response behaviour.
- **`List-Unsubscribe` header.** Needs AgentMail's API to be checked first.
- **Some of the app is still English only** in an eleven-language app: the
  home page, About, Privacy, the sign-up form and all four interactive
  lessons. Each of those regions now declares `lang="en"` so a screen reader
  pronounces it correctly and a browser's translator can offer to translate
  it — delete that attribute in the same change that translates the region.
  See PLAN.md section 29.
- No right-to-left language: the layout uses physical direction classes.

## Never do these

- Commit a secret, or print one into a terminal, a log or a document.
- Make `email.sendTestDrill` public. It would mail any address a caller named.
- Add a crawl source without reading its robots.txt and licence first, or
  promote one before reading every card it produced on dev.
- Break the news feed. It is the demo.
