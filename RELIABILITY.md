# Reliability changes — 2026-09-21

These changes follow the review of Claude's latest work through `b9eeac7`.
The translated demo identifier fix, language-of-parts declarations, and narrow
accessibility menu are preserved. This update is implemented locally; it is
not a record of a production deployment.

## Consent

Public sign-up requests cannot reactivate an unsubscribed address or change
consented feeds. Proposed feeds live in `pendingKinds`; current delivery and
preferences remain unchanged until the mailbox owner submits the signed
confirmation form. Pending requests share the existing confirmation cooldown.
Legacy subscribers with no `pending` field remain confirmed.

## Complete translations

News translation starts from `saveDrill`, after its lesson has been saved.
The front can appear before translations finish; English remains the fallback.
The read and write paths reject a missing drill, incorrect generated structure,
or a recorded source hash that no longer matches. Existing incomplete cache
rows are replaceable. The existing backfill now detects those rows too.

Generated text can still be mistranslated: structural validation does not prove
semantic accuracy or that choices retain their meanings. Concurrent cache misses
can still make duplicate model calls, although only one valid cache row is kept.
Claude's `back.demo` exclusion and client-side identifier lookup remain intact.

## Email matching and recovery

`sentDrills` maps each outgoing message ID to its subscriber and drill. Inbound
`in_reply_to` and `references` select the original lesson, with subscriber
ownership checked before grading. Unmatched messages are ignored rather than
graded against the last lesson. **Emails sent before this mapping exists do not
gain a mapping automatically; use a newly sent drill for the demo.**

`saveGrade` stores the verdict and schedules feedback in one mutation. Delivery
claims atomically schedule recovery, with five attempts at 65-second intervals.
Every retry uses the same `Idempotency-Key`; sent or unsubscribed recipients stop
the chain. Failed delivery stays visible on the attempt. The retry window stops
before the provider's 24-hour key expiry. Previously scheduled legacy sends
without an attempt ID retain their old one-shot behaviour.

Provider contracts checked:

- [Idempotent sends](https://docs.agentmail.to/idempotency)
- [Inbound message fields](https://docs.agentmail.to/api-reference/webhooks/events/message-received)

Daily sends now paginate through active subscribers in batches of 20, including
past pages containing only unconfirmed addresses. A daily per-subscriber key
prevents duplicate sends when rerunning the same day's unchanged request.
Daily batch interruption and failed model grading are not automatically retried;
the recovery mechanism here covers feedback delivery.

## Navigation and disclosure

Hash URLs restore pages and feeds on refresh and support browser Back/Forward.
Each card has a localized link to its own view. Missing cards and invalid hashes
show a recovery state. Hash routing does not add per-card search indexing or
change the hosting layer's HTTP status codes.

Practice copy distinguishes browser-only choices from online speech generation.
Privacy copy now describes pending email storage, delivery records and cached
speech, and no longer asks readers to publish their browser IDs in public issues.

## Verification

Run `npm test`, `npm run test:browser`, `npm run build`, and
`npx tsc --noEmit -p convex/tsconfig.json`.
The browser suite uses installed Chrome through Playwright; on another machine,
install Chrome or select an installed browser in `playwright.config.ts`.
All mail/model calls in unit tests are mocked. Browser navigation checks do not
send messages or call paid model actions.

Verified in this session: 21 unit/in-memory regression tests, three headless
Chrome browser checks (including a real local card permalink), production
build, backend typecheck and lint (six existing warnings, no errors). The local
Convex schema/functions push passed. A temporary card was appended only to the
local database for the permalink check and removed afterward.

To include the permalink browser test again, start the local backend and verify
the target is local, append `tests/browser/permalink.fixture.json` with
`convex import --deployment local --table stories --append`, and read the ID
with `stories:listPublished` for kind `course`. Set `FLIPSEC_TEST_STORY_ID` to
that fixture ID before `npm run test:browser`. The test is explicitly skipped
when no fixture ID is provided. Remove only that fixture afterward with the
internal `stories:unpublish` mutation. Never use production for this fixture.

The configured local Convex deployment is `local-kent_agan-flipsec`.
Production schema changes are additive: optional delivery/source/preference
fields and the new `sentDrills` table. A production deploy still needs to happen
before the public app gets these fixes. Incomplete existing translations can be
repaired with the existing backfill after deployment; that spends model calls.

## Submission evidence still needed

1. One new drill delivered to a real mailbox, replied to, with feedback received.
2. Three observed user sessions: what they understood, missed, and would do next.
3. A video under three minutes showing the real learning and email loop.
4. Confirm registration, social post, final video URL, and submission.

Do not describe a mocked test as email delivery or a user study. The hosting
header limitation and API key rotation remain the separately recorded work in
AUDIT.md; no domain, key, or production configuration was changed here.
