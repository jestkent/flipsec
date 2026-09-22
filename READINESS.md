# Current hackathon readiness — 2026-09-21

This is the current status summary. Dated entries in AUDIT.md, PLAN.md and
hackathon.md remain historical evidence, not deployment manifests.

## DEPLOYED — 2026-09-21

Commit `37c91ed`, branch `readiness-followup`, is live on
`hallowed-nightingale-322`. The sections below that say "not deployed" describe
the state before this rollout and are kept for their reasoning, not their
status.

- Backend: `npx convex deploy` added `browserSessions.by_tokenHash` and
  `stories.by_kind_source`. No indexes deleted, schema validation passed.
- Frontend: bundle `index-CmD4s1vT.js`, built against
  `https://hallowed-nightingale-322.convex.cloud` and verified to contain no
  `127.0.0.1` reference before upload. The live page serves that bundle.
- Verified after rollout: feeds read **8 news, 17 learn, 10 jobs** — unchanged
  from the pre-deploy baseline, so nothing regressed. `browserSessions:create`
  returns a token and expiry on prod.

Still true after deploying: **job retirement has not run yet.** It takes effect
on the next successful Greenhouse crawl, within six hours. Do not claim any
listing was rechecked until a crawl has completed. Every reader's pre-existing
Ask FlipSec conversation is now unreachable, by design, and older open tabs
fail closed for chat until reloaded. Cold-mailbox signup and the user study
remain unobserved.

## What is established

- Baseline reviewed: commit `1095ebc`; the working tree was clean before this
  follow-up. The earlier reliability work is committed, not an uncommitted patch.
- AUDIT.md §5b records a human-verified production drill → reply → grade →
  threaded follow-up on September 21. This session did not repeat that exchange.
  The earlier suspected missing delivery was diagnosed as incorrect threading;
  do not present it as proof of SPF/DKIM/DMARC failure.
- Exact parity between today's source and production has not been independently
  established in this session. A public fetch failure from a review tool is not
  evidence of an outage.

## This follow-up: implemented locally, not deployed to production

This follow-up remains uncommitted in the working tree.

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

**The browser suite needs `npx convex dev` running against
`local-kent_agan-flipsec`, with published stories in it.** Playwright starts
the Vite dev server but not the backend. Without it the feed never resolves,
the sign-up box never renders — it sits after the third card — and the
language test fails on English with "element(s) not found" for the email
label. That failure means the backend is down, not that the page regressed.
Reproduced on 2026-09-21: **3 passed, 1 failed, 1 skipped** with no backend.
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
