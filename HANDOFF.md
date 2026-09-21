# Picking this up on another machine

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

## Still open, on purpose

- **Security headers.** No CSP, HSTS or frame protection. Cannot be set from
  the repository: static hosting serves fixed headers. It cannot be set from a
  Cloudflare dashboard either, which AUDIT.md used to say — `*.convex.site` is
  Convex's zone, not ours, so there is no Transform Rule to add. It is blocked
  behind a custom domain. AUDIT.md section 6 has the reasoning and a starter
  policy, and flags the three lines that break the app if they are wrong.
- **API key rotation.** Deferred by the project owner to do last. AUDIT.md
  section 8 item 1.
- **URL routing.** Views live in `App.tsx` state, so there is one indexable
  URL, the back button does not move between views, unknown paths return 200,
  and a card cannot be shared as a link.
- **`List-Unsubscribe` header.** Needs AgentMail's API to be checked first.
- The home page and About are **English only** in an eleven-language app.
- No right-to-left language: the layout uses physical direction classes.

## Never do these

- Commit a secret, or print one into a terminal, a log or a document.
- Make `email.sendTestDrill` public. It would mail any address a caller named.
- Add a crawl source without reading its robots.txt and licence first, or
  promote one before reading every card it produced on dev.
- Break the news feed. It is the demo.
