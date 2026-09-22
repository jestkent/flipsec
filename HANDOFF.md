# Picking this up on another machine

## Current work

Read [READINESS.md](READINESS.md) first and inspect git status/diff. The prior
reliability changes are committed; the latest baseline reviewed was `1095ebc`.
This follow-up adds anonymous sessions, job availability reconciliation,
localized onboarding and shorter non-English practice. It is committed as
`37c91ed` and IS deployed to production — see the DEPLOYED section at the top
of READINESS.md.

The existing production email evidence is in AUDIT section 5b. Do not confuse
that with the still-pending cold-mailbox signup. Do not deploy a dev-built dist
to production. Run tests, browser checks, build, backend typecheck and lint.

`npm test`, `npm run build` and `npm run lint` need no backend. **`npm run
test:browser` needs a reachable dev backend holding published stories**, and
what that costs depends on the machine. Linked to a LOCAL backend
(`local-<team>-flipsec`), start `npx convex dev` in a second terminal first:
Playwright starts Vite but not Convex, so without it the feed never loads, the
sign-up box after the third card never renders, and the language test fails on
English looking for the email label. That is the backend being down, not a
regression. Linked to a HOSTED dev deployment, nothing extra is needed — run
`npx convex dev --once` to sync functions and the suite passes on its own.
Confirmed both ways; see READINESS.md.

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

Deploying to production is three steps, and the middle one is the trap:

```bash
npx convex deploy --yes                       # resolves to prod on its own

printf 'VITE_CONVEX_URL=https://hallowed-nightingale-322.convex.cloud\n' > .env.production.local
rm -rf dist && npm run build
grep -c "hallowed-nightingale-322" dist/assets/*.js   # MUST be 1 before upload
rm .env.production.local

CONVEX_DEPLOYMENT=prod:hallowed-nightingale-322 \
  npx @convex-dev/static-hosting deploy --skip-convex --skip-build
```

**`main.tsx` bakes `VITE_CONVEX_URL` into the bundle at build time**, and
`.env.local` points it at whatever deployment THIS machine is linked to — a
local backend on one, a hosted dev deployment on another. A plain
`npm run build` therefore produces a bundle that reaches the wrong backend,
and uploading it puts a blank or broken site on the live URL.
`.env.production.local` beats `.env.local` in production mode and is
gitignored by `*.local`; delete it afterwards so local builds stay local.

**Grep FOR the production host, never against `127.0.0.1`.** This check used
to read `grep -c "127.0.0.1"` must be 0, which only proves anything on a
machine linked to a LOCAL backend. On a machine linked to a hosted dev
deployment it returns 0 for a bundle pointing at
`scintillating-antelope-309.convex.cloud`, so it waved through exactly the
bundle it exists to catch. Measured on such a machine, 21 September 2026. A
positive check cannot pass for the wrong reason: the prod host is in the
bundle or it is not. Grep every time — it is one command and it is the only
proof.

`npx convex deploy` ignores `CONVEX_DEPLOYMENT` and resolves to the project's
prod. **The static-hosting CLI does not** — it has no `--prod` flag, so with a
local deployment configured it would upload to the wrong place and look like it
worked. Name the target in the environment, and check the output says
"Deploying to production environment" before believing it.

`--skip-convex` avoids a prompt that fails a non-interactive shell.
`--skip-build` keeps the bundle you just verified instead of silently
rebuilding an unverified one.

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

**Recording a demo?** PLAN.md section 12 is the script and **12a is the
pre-flight**. Read 12a first: it lists the four ways the email loop fails on
camera, which Learn card to pick for the language shot, and why filming a live
crawl does not work.

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
- **Language scope.** Current local Home/signup cover all 11 languages; the
  four practice topics have shorter localized alternatives. About, Privacy,
  email and some assistant controls are still English. No native-speaker review
  has been recorded. Historical notes about all lessons being English-only are
  superseded by this follow-up, not by a production deployment claim.
- No right-to-left language: the layout uses physical direction classes.

## Never do these

- Commit a secret, or print one into a terminal, a log or a document.
- Make `email.sendTestDrill` public. It would mail any address a caller named.
- Add a crawl source without reading its robots.txt and licence first, or
  promote one before reading every card it produced on dev.
- Break the news feed. It is the demo.
