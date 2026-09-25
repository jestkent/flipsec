# Current hackathon readiness — 2026-09-25

This is the current status summary. Dated entries in AUDIT.md, PLAN.md and
hackathon.md remain historical evidence, not deployment manifests.

## OPERATIONAL STATUS — observed 2026-09-25T03:40Z

Checked against the production deployment, not inferred from the code.

**Working.**

- **The daily email sends.** Three consecutive mornings at 14:00:54 UTC --
  2026-09-22, 09-23 and 09-24 -- each recorded `sent 2, failed 0, of 2 active`
  with `ok: true`. Two distinct drills went out across that period, so the
  `lastDrillId` rotation works and readers are not receiving one card forever.
- **Job retirement has run.** See the correction below: this supersedes every
  earlier "has not run yet" in this file.
- **Translation on write holds.** All ten non-English languages report zero
  untranslated cards, including a news card published after 2026-09-22.
- **The site is healthy.** Seventeen rendered-page checks pass: the flip with
  one face `inert` and `aria-hidden`, focus handoff, tab keyboard handling,
  all three feeds populating, Spanish translating the card body, and no
  horizontal scroll at 320px.

**Broken, and it is billing rather than code.**

- **Firecrawl credits are exhausted.** Every index scrape returns HTTP 402
  `Insufficient credits` -- AI Incident Database, IC3, FTC and OWASP alike.
  It degraded across three runs: `found 30, scraped 14, failed 16` at
  2026-09-24T06:56Z, then `found 0` at 12:56Z, 18:56Z and 2026-09-25T00:56Z.
  `health:status` reports `ok: false` and the logs carry
  `CRON UNHEALTHY crawl sources`, which is the alerting working rather than a
  second fault.
  **What it breaks:** no NEW News or Learn cards. **What it does not break:**
  the published cards stay readable, the daily email keeps sending them, and
  Jobs is unaffected because it uses the Greenhouse JSON API rather than
  Firecrawl. The fix is to top up or upgrade the Firecrawl plan; until then
  the cron keeps failing every six hours, correctly and loudly.
  A crawl that reports `found 0, scraped 0, failed 0` cannot be told from a
  genuinely quiet index without reading the log -- `failed 0` is counted over
  items that were never found. Check the logs for a 402 before assuming the
  sources went quiet.

**Feed counts on 2026-09-25:** 9 news, 17 learn, 8 jobs. Jobs fell from 10
because two roles closed and were retired, which is the feature working.

## DEPLOYED — `c222b58`, backend and frontend, 2026-09-22T03:45Z

Both halves are on `hallowed-nightingale-322`. `37c91ed` was the original
rollout of this branch on 2026-09-21; the sections below that say "not
deployed" describe the state before it and are kept for their reasoning, not
their status.

- Backend: `npx convex deploy` reported no indexes deleted and schema
  validation complete. `{ limit: 2.7 }` on `stories:listPublished` returns 2
  rows on prod where it used to throw "Arg 1 `n` to `take` must be a
  non-negative integer".
- Frontend: bundle `index-CkEEeBw5.js` with `index-C0ksmxpu.css`, built
  against `https://hallowed-nightingale-322.convex.cloud`. Verified BEFORE
  upload to name that host once and to contain no `127.0.0.1` and no
  `scintillating-antelope-309`; verified AFTER upload to be byte-identical to
  the local file. The upload named the production environment in its own
  output before it was believed.
- Verified on the RENDERED live page, not just the served bytes: home titles
  itself `FlipSec.ai` (it was `FlipSec.ai | FlipSec.ai`), a card flips with
  exactly one face `inert` + `aria-hidden` and focus handed to the visible
  face, Left/Right and Home/End drive the feed tabs, all three feeds render
  8 / 17 / 10 cards, Spanish translates the card body and sets
  `<html lang="es">`, and there is no horizontal scroll at 320px. Zero console
  errors. The two 4xx are external and benign: an FTC `og:image` that 403s
  and falls back to `TacticArt` through `onError`, and a Chrome-initiated
  favicon lookup — the declared favicon serves 200.

**Superseded on 2026-09-25 -- see OPERATIONAL STATUS above.** What follows was
true when written and is kept for its reasoning. At 2026-09-22T03:52Z the last
`crawl jobs` run was 2026-09-21T22:55:24Z, BEFORE this code existed, and no
published job row carried a `jobCheckedAt`, so no listing had been rechecked.
`send daily drill` read "no run recorded", which was expected rather than a
fault: it fires at 14:00 UTC and health recording only landed at
2026-09-21T19:45Z, after the last firing. Both have since run.

- Backend: `npx convex deploy` added `browserSessions.by_tokenHash` and
  `stories.by_kind_source`. No indexes deleted, schema validation passed.
- Frontend: bundle `index-CmD4s1vT.js`, built against
  `https://hallowed-nightingale-322.convex.cloud` and verified to name that
  host before upload. The live page serves that bundle, byte-identical to a
  local rebuild. Grep FOR the prod host, not against `127.0.0.1`: see the
  recipe in HANDOFF.md for why the negative check proves nothing.
- Verified after rollout: feeds read **8 news, 17 learn, 10 jobs** — unchanged
  from the pre-deploy baseline, so nothing regressed. `browserSessions:create`
  returns a token and expiry on prod.

**Job retirement HAS now run, verified 2026-09-25.** All eight published jobs
carry a `jobCheckedAt` from the 2026-09-24T22:55Z crawl, and the feed fell
from ten to eight because two roles closed on the employer's own board and
left the feed through their status alone. The sentence this replaces said it
had not run yet, which was true until the first successful Greenhouse crawl
after the rollout.

Every reader's pre-existing Ask FlipSec conversation is unreachable, by
design, and older open tabs fail closed for chat until reloaded. Cold-mailbox
signup and the user study remain unobserved.

## DEPLOYED — `99e7934`, backend and frontend, 2026-09-22T05:10Z

Everything on this branch is live on `hallowed-nightingale-322`.

1. **The first card on confirming** (`ad6598f`). Backend. `npx convex deploy`
   reported schema validation complete and no indexes deleted.
   `email.js:sendWelcome` is present in the production function spec.
2. **The card front no longer prints its own permalink** (`99e7934`).
   Frontend, bundle `index-DVByZwSf.js`. Verified before upload to name the
   production host once with no localhost or dev reference, and after upload
   to be byte-identical to the local file.

Re-verified on the rendered live page after both: home titles itself
`FlipSec.ai`, a card flips with exactly one face `inert` + `aria-hidden` and
focus handed to the visible face, the feed tabs answer Left/Right and
Home/End, all three feeds render 8 / 17 / 10 cards, Spanish translates the
card body and sets `<html lang="es">`, and there is no horizontal scroll at
320px. Zero console errors. The `cardLink` string is still inside the bundle
as an unused dictionary entry; no control renders it.

## What is established

- Baseline reviewed: commit `1095ebc`; the working tree was clean before this
  follow-up. The earlier reliability work is committed, not an uncommitted patch.
- AUDIT.md §5b records a human-verified production drill → reply → grade →
  threaded follow-up on September 21. This session did not repeat that exchange.
  The earlier suspected missing delivery was diagnosed as incorrect threading;
  do not present it as proof of SPF/DKIM/DMARC failure.
- Exact parity between source and production IS established, 2026-09-21:
  building `37c91ed` against the production Convex URL reproduces the served
  `index-CmD4s1vT.js` and `index-C0ksmxpu.css` byte for byte (bundle sha256
  `ef7c7b76fbcc3c612ab14cd87937c08a0212ce7298b45578fc51a81dd21d4129`). The
  live bundle names the production host once and contains no localhost or dev
  reference. A public fetch failure from a review tool is not evidence of an
  outage.

## This follow-up: implemented locally, not deployed to production

Committed as `37c91ed` and deployed; see the DEPLOYED section above. The
numbered points below are the reasoning, which has not changed.

1. **Consistent status.** The other documents point here and no longer describe
   the earlier email round trip as unproven or the earlier work as uncommitted.
2. **Language and focus.** Home and signup support all 11 languages. Each of the
   four lesson topics has a shorter localized interactive exercise outside
   English; these are intentionally not full translations of the longer English
   simulations. Original English demonstrations remain. Fictional dialable-looking
   numbers and culture-specific details were removed from two English lessons.
   News/learning lead the home page; careers are secondary. A real news card can
   be flipped directly on Home.
3. **Private browser conversations.** The server issues a 256-bit secret, stores
   its SHA-256 hash, and derives the owner server-side. Read, continue and delete
   require that session; a supplied reader ID does not authorize them. Sessions
   expire after seven days; expiration revokes access and schedules bounded
   conversation cleanup. Issuance has an independent global rate limit.
4. **Job availability.** Each successful, validated complete employer snapshot
   reconciles existing jobs in batches. Missing roles become closed and leave
   feeds, permalinks and daily selection. A later successful snapshot may reopen
   them. Network/invalid-response failures do not close jobs, and older checks
   cannot overwrite newer ones. The received count must match `meta.total` from
   the [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html#list-jobs)
   before a snapshot can close jobs. Employer availability is not guaranteed between
   six-hour checks; the UI and mail direct readers to verify before applying.
5. **Onboarding and observation.** An automated test follows the actual generated
   confirmation URL, verifies GET does not consent, then POST enables delivery.
   Mail is mocked. USER_TESTING.md provides the fresh-mailbox checklist, three
   short observation sessions and an empty evidence table.

## Remaining limitations and actual evidence needed

- About, Privacy, email, the email confirmation page and some assistant controls
  remain English. The UI discloses this. Translations and new exercises have not
  been reviewed by native-speaking participants.
- Anonymous browser sessions are not OAuth accounts or verified identities.
  The credential is in localStorage: shared devices, malicious same-origin code
  and stolen tokens remain risks. There is no cross-device account recovery.
- Legacy conversations are deliberately not claimed using the old insecure
  reader ID. They remain stored but inaccessible through the upgraded public
  APIs; an owner-managed retention/deletion decision is still required. Existing
  cached speech is not deleted with a conversation.
- Session cleanup schedules component deletion; this is not proof that every
  future cleanup job will succeed. Monitor failures. Global limits bound spending
  but a hostile visitor can still consume shared quotas.
- No cold-mailbox delivery or manual new-signup confirmation was observed during
  this follow-up. Await an authorized mailbox and its owner's participation.
  The prior real-mailbox round trip remains valid evidence of that narrower flow.
- No user study occurred. Do not invent testimonials, effectiveness percentages,
  learning gains, or engagement. USER_TESTING.md is a protocol, not results.
- Registration, a real social post, a video under three minutes, and final
  submission still require owner confirmation/evidence. No new messages were sent.
- Hosting security headers and key rotation retain their separate open status.

## Verification and rollout

Local Convex schema/functions push passed. An actual local session was issued
without exposing its token. Regression suite: **28 passed**, with no backend
needed. Browser suite: **4 passed, 1 explicitly skipped** (the published-card
test requires its local fixture). The new browser checks cover all 11
home/signup languages at 320px and all four Spanish practice topics.
Automated mail/model calls are mocked.

**The browser suite needs a reachable dev backend holding published stories.**
Against a LOCAL backend (`local-kent_agan-flipsec`) that means `npx convex
dev` running in a second terminal: Playwright starts the Vite dev server but
not the backend, and without it the feed never resolves, the sign-up box never
renders — it sits after the third card — and the language test fails on
English with "element(s) not found" for the email label. That failure means
the backend is down, not that the page regressed. Reproduced on 2026-09-21:
**3 passed, 1 failed, 1 skipped** with no backend. Against a HOSTED dev
deployment no second terminal is needed — `npx convex dev --once` to sync,
then **4 passed, 1 skipped**, confirmed 2026-09-21 on
`scintillating-antelope-309`.
Production build and backend typecheck pass. Lint reports no errors and the six
existing warnings. These checks do not certify linguistic accuracy, live delivery,
or user outcomes.

Production rollout requires explicit approval for `hallowed-nightingale-322`.
Deploy the additive schema/backend and the frontend built against the production
Convex URL together. Older browser clients will fail closed for chat until they
reload. Do not deploy a dist built against the local backend. Job retirement
takes effect after a successful employer crawl; do not claim every existing
listing was rechecked merely because the code deployed. Review the public site
after rollout and record the deployed commit/time here.
