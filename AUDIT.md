# Production readiness audit

## Latest local reliability update

See [RELIABILITY.md](RELIABILITY.md) for new consent, translation, email matching,
delivery recovery, pagination and navigation fixes. They are implemented and
validated locally, not yet deployed to production. Historical statuses below
refer to their named commits. URL sharing/history are now implemented locally;
per-card SEO and hosting response headers remain open.

The follow-up review found that existing-address sign-up could bypass consent,
translation could cache a missing drill, and late email replies used the wrong
drill. Regression tests cover these paths. The earlier audit did not establish
that those behaviours were correct.

Audit run 2026-09-21 against commit `a0910d6` and the live deployment.

Fixes run from `c233aa8` to `00d3312`. The findings table below names the
commit for each, which is more useful than a list here that goes out of date
every time something ships.

This file exists so a future debugging session can tell a deliberate choice
from an accident. Where a fix has a failure mode, it is written down here
rather than left to be rediscovered.

---

## 1. The outage this found

Ask FlipSec was **down in production** when the audit ran, and nobody had
reported it.

Every reserve function counted **every row** in `toolChecks`, whatever wrote
it. The table is shared, so the three budgets were never independent:

| Function | Ceiling it enforced | Rows it counted |
| --- | --- | --- |
| `reserveChat` | 160 global | all of them |
| `reserveSpeech` | 300 global | all of them |
| `reserveTranslation` | 300 global | all of them |

210 legitimate translations — a pre-generation run, not an attack — put 255
`translate` rows in the hour. `reserveChat` hit its 160 and started throwing
`"Ask FlipSec has reached its hourly limit"` for every visitor, while
`reserveSpeech`, reading the same rows against 300, kept passing. That
asymmetry is what proved the mechanism.

The per-reader caps had the same fault and were **worse in practice**: one
reader translating 30 cards spent their own Ask FlipSec budget on
translations, so switching language could cost them the assistant.

**Fixed in `c233aa8`.** Budgets now count only their own kinds, through two
additive indexes. See §4.

### Debugging note

If a feature starts reporting an hourly limit with no obvious traffic, check
`toolChecks` by kind first:

```bash
npx convex data toolChecks --prod --order desc --limit 400
```

Rows carry `kind`. A budget should only ever be blocked by its own kinds. If
it is blocked by somebody else's, this regression is back.

---

## 2. Findings and status

| ID | Finding | Severity | Status |
| --- | --- | --- | --- |
| M-1 | Shared rate-limit bucket starved Ask FlipSec | **High** (raised from Medium once reproduced) | Fixed `c233aa8` |
| H-1 | `subscribe` had no rate limit and no consent step | **High** | Fixed `9c59bec` |
| H-3 | No privacy notice despite collecting email and conversation text | **High** | Fixed `f8235ec` |
| M-2 | `/unsubscribe` acted on GET | Medium | Fixed `9c59bec` |
| M-3 | `listPublished` limit caller-controlled, unbounded | Medium | Fixed `877f7dc` |
| M-4 | `submitAnswer` had no cap | Medium | Fixed `877f7dc` |
| A-1 | Form control borders 1.31:1, WCAG 2.2 §1.4.11 needs 3:1 | Medium | Fixed `877f7dc` |
| A-3 | No error boundary — a render error showed a blank page | Medium | Fixed `877f7dc` |
| S-1 | No Open Graph tags; a shared link rendered as a bare URL | Medium | Fixed `f8235ec` |
| L-1 | No robots.txt or sitemap.xml | Low | Fixed `f8235ec` |
| L-2 | `favicon.svg` + `icons.svg` shipped, referenced by nothing | Low | Fixed `f8235ec` |
| T-1 | Translation happened on READ, so any card published after a warm-up run stayed English | **High** | Fixed `f68f849` |
| T-2 | Interface labels hardcoded in English over fully translated cards — `Illusion.tsx`, then `ScamFlow.tsx` | Medium | Fixed `0c7acc5`, `82c2e4e` |
| E-1 | The daily email promised "I will tell you how you did" and never sent the grade | **High** | Fixed `00d3312` |
| E-2 | `saveReply` inserted unconditionally — once the grade is mailed, an auto-responder makes a mail loop | **High** | Fixed `00d3312` |
| C-1 | Ask FlipSec recommended "check for poor spelling and grammar" — the exact heuristic the app exists to refute — because its system prompt never stated the premise | **High** | Fixed `TBD` |
| E-3 | The daily course and job card never rotated — `take(1)` with no memory, so Learn and Jobs subscribers got the SAME card every morning until a crawl published a newer one, which is routinely days | **High** | Fixed `0c9250f` |
| E-4 | Learn and Jobs sections never invited a reply, so those readers had no way to know Ask FlipSec would answer them | Medium | Fixed `0c9250f` |
| **H-2** | **No security headers** — no CSP, HSTS, or frame protection | **High** | **OPEN — hosting layer, see §6** |
| S-3 | No URL routing: one indexable URL, back button inert, soft 404 | Medium | **PARTLY CLOSED** — hash routing ships; the soft 404 and single indexable shell remain, see §7 |
| L-3 | No `List-Unsubscribe` header | Low | **OPEN — see §7** |
| L-4 | All 11 language dictionaries ship to every reader | Low | **OPEN — see §7** |
| L-5 | Google Fonts is a render-blocking third-party request | Low | **OPEN — see §7** |

### Checked and found clean

Recording these so they are not re-audited from scratch:

- No secrets in tracked source, **full git history**, or the built bundle.
  `.env.local` was never committed.
- No sourcemaps in production.
- No server SDK leakage — `openai`, `firecrawl`, `@ai-sdk` and all three API
  hostnames are absent from the client bundle.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- Zero XSS sinks: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`,
  `new Function`, `document.write`.
- HTTPS enforced; plain HTTP returns 301.
- `assistantMessages.list` **does** verify thread ownership and returns `[]`
  on mismatch. It takes a caller-supplied `userId`, which looks like the
  pattern that got `attempts.listForUser` deleted, but it is not.
- The AgentMail webhook signature check is sound: HMAC over
  `id.timestamp.body`, 5-minute replay window, both header spellings,
  timing-safe compare, fails closed.
- Emails are **plain text**, so there is no HTML injection path into mail.
- Attached images are canvas re-encoded client-side, which strips EXIF and
  GPS, and are never persisted.
- Text contrast: every palette pair computed, all pass (lowest 4.78:1). Focus
  ring 6.68:1 against a 3:1 requirement.
- No cookies, no analytics, no tracking pixels, no third-party embeds beyond
  Google Fonts. **A cookie banner is not required** and should not be added.

---

## 2a. What the first real test turned up

Everything in §2 was found by reading code. These four came out of the first
sign-up with a real mailbox, which is why §5 says an untested flow is not a
verified one.

| Found | Why it mattered | Fixed |
| --- | --- | --- |
| The form said "check your email" to an address that was already confirmed, which is sent no second message by design | The reader waits for mail that is never coming and concludes sign-up is broken | `a667ef6` |
| Signing up from three tabs sent three identical confirmations | Mail amplification through the very form double opt-in exists to protect: three per address per hour | `da0c94c` |
| The confirm page only offered agreement, and the feeds had been guessed from whichever tab the reader was on | Signing up from three tabs is not the same as wanting three feeds | `aa0b35a` |
| A valid signature for a deleted row answered "You are on the list" | Untrue, and the same shape as a real failure: unsubscribe, find an old mail, click it, be told you are subscribed | `aa0b35a` |

The README also claimed emailed replies "come back graded". At the time of
the audit the grading ran and the result was stored on the attempt, and
**nothing was ever sent back** — `gradeReply` had zero mail calls, and there
were graded rows in the database no human had seen. **Closed in `00d3312`**;
see E-1 below.

## 3. Things a future change could break

Each of these is load-bearing. The comment in the code says so too; this is
the index.

### `pending` absent means CONFIRMED

`subscribers.pending` is `v.optional(v.boolean())`. **Absent means confirmed.**
Every row written before double opt-in existed is a real reader who asked for
the mail under the old flow. Reading absent as "pending" would silently
unsubscribe all of them.

`listActive` filters `s.pending !== true`, not `s.pending === false`. That
distinction is the whole safety property. Do not "tidy" it into a boolean
with a default.

### Confirm and unsubscribe sign different HMACs

`unsubscribeToken(email)` signs the bare address. `confirmToken(email)` signs
`confirm:<address>`. They must stay different, or an unsubscribe link could
confirm a subscription and vice versa.

`unsubscribeToken` must keep signing the **bare** address: links in mail that
has already been delivered contain those tokens and have to keep working.

### Both mail routes draw a button on GET and act on POST

Outlook Safe Links, Proofpoint URL Defense and Gmail fetch links in mail
before a human sees them. A GET that unsubscribed on sight quietly removed
real readers. A GET that confirmed on sight would make double opt-in
meaningless, because the scanner would be doing the consenting.

Do not "simplify" either route back to acting on GET.

### The address reaches HTML now

`/confirm` and `/unsubscribe` put the address in a hidden form field. That is
the first time request data reaches the hand-built HTML in `http.ts`, and
nothing there escapes anything for us. `escapeHtml` is not decorative.

### Reserve only when the work will actually cost something

`translateStory` reserves **after** the cache is checked. A cache hit must
stay free and unmetered, or a reader switching language on a warm feed spends
their hourly budget on rows already paid for.

### `border-field` is for form controls only

`--color-line` (#d9e2ec, 1.31:1 on white) is fine as the edge of a card and
**not** fine as the only thing showing where an input is. `--color-field`
(#6e879f, 3.73:1 on white, 3.42:1 on ivory) exists for the three controls
whose boundary it is. Do not swap the app over to it wholesale — the quiet
card line is a deliberate design choice.

A Tailwind v4 theme token that self-references generates **no CSS at all and
fails silently**. After adding one, check the compiled output:

```bash
grep -oaE "\.border-field\{[^}]*\}" dist/assets/index-*.css
```

### The absolute URLs move together

`index.html` (canonical, `og:url`, `og:image`, `twitter:image`) and
`public/sitemap.xml` and `public/robots.txt` all hardcode
`https://hallowed-nightingale-322.convex.site`. Open Graph does not resolve
relative paths, so they have to be absolute. If a custom domain is added,
**all of them change together**.

---

### Cron health is judged on what a run FOUND

`crawlSources`, `crawlJobs` and `sendDailyDrill` each catch their own
per-source, per-article and per-subscriber errors and return counts, so none
of them throws when a run achieves nothing. Convex records a successful
execution and the dashboard shows green. A crawl that quietly stopped matching
an index page looks exactly like a crawl that found nothing new.

`health.recordRun` therefore sets `ok` from what a run **found**, never from
what it saved. `saveRawStory` drops anything already seen, so a six-hourly
crawl that saves nothing is the normal case. Switching `ok` to `scraped` or
`queued` would fire four times a day and teach whoever reads it to ignore the
signal.

A run that throws deliberately records **no row**. Convex already logs it, and
the job's last row simply stops advancing, so staleness is that tell. Two
failure modes, two signals - do not "fix" the missing row.

---

## 4. Rate limits, as they now stand

One table, `convex/rateLimit.ts`. Counting and inserting happen in a single
mutation — check-then-act is not a limit on a public endpoint.

| Budget | Kinds counted | Per reader / hr | Global / hr | Reserved by |
| --- | --- | --- | --- | --- |
| `chat` | `chat`, `image` | 10 | 160 | `assistant.ask` |
| `speech` | `speech` | 20 | 300 | `localization.speak` |
| `translate` | `translate` | 30 | 300 | `translateStory`, **cache miss only** |
| `subscribe` | `subscribe` | 3 | 60 | `subscribers.subscribe` |
| `answer` | `answer` | 60 | 600 | `attempts.submitAnswer` |
| `emailAsk` | `emailAsk` | 5 | 60 | `attempts.saveReply`, for a question asked BY EMAIL |

`emailAsk` is deliberately the second tightest budget in the table. The sender
is a mailbox rather than a browser id, and only a confirmed subscriber is
answered at all, so the per-reader cap is a real limit here rather than a
courtesy. It is also the ceiling on a mail loop: if an answer of ours ever
provokes another reply, the exchange stops after five in an hour instead of
running all night at a model call per turn. The first guard is RFC 3834
detection on the inbound route, which refuses anything marked
`Auto-Submitted`, `Precedence: bulk`, `X-Autoreply`, `List-Id`, or subjected
"Out of office" / "Automatic reply", before a single row is written.

`questions.reserve` is separate and unchanged: it counts the `questions`
table, which is its own store, so it never had the cross-contamination
problem. It backs both `askAboutStory` and `teachLesson` at 10 per reader and
200 globally.

`userId` comes from the browser and can be regenerated, so every per-reader
cap is a courtesy. The global cap is the one an attacker cannot get around.

Indexes: `by_kind_time` (`kind`, `createdAt`) and `by_user_kind_time`
(`userId`, `kind`, `createdAt`). `by_user_time` and `by_time` are kept —
dropping an index is not an additive change.

---

## 5. How the fixes were verified

Not "it compiled". Each against production:

| Fix | Check | Result |
| --- | --- | --- |
| M-1 | The probe that returned "hourly limit" before | Answers |
| H-1 | `listActive` count before and after deploy | 1 → 1, nobody dropped |
| H-1 | New sign-up row | `pending: true`, excluded from send |
| H-1 | Forged token on `/confirm` and `/unsubscribe` | Both "That link is not valid" |
| H-1 | 4th sign-up in an hour from one reader | Blocked |
| M-3 | `listPublished` with `limit: 9999` | Returns 6 |
| M-4 | Drill answer, and an out-of-range choice | Grades; rejected |
| A-1 | Compiled CSS for `.border-field` | Rule present, both palettes |
| S-1 | Served HTML, and the card URL | Tags present, 200 `image/png` |
| L-1 | `/robots.txt`, `/sitemap.xml` | 200 |
| L-2 | `/favicon.svg`, `/icons.svg` | 404 |
| all | Three feeds after every deploy | 6 / 11 / 10 at the time, unchanged by each fix |

Test data created and then removed: three `subscribers` rows on the reserved
`.invalid` TLD (RFC 2606, never resolves, so no real address was mailed), and
one Agent thread. **One `attempts` row remains** under `userId`
`audit-probe-answer` — there is no `forget` for attempts and inventing one
for a single row was not worth the risk.

### What could not be verified

There is no browser in the environment that made these changes. Everything
below is derived from source and computed values, **not from seeing the page
render**:

- the Privacy view actually laying out correctly
- the error boundary's fallback screen
- `border-field` on the three inputs at real size
- the 320px overflow risk on the Accessibility dropdown (`w-72`, 288px)

These need one pass on a real device.

---

## 5a. Step 67 verified on production

`health.recordRun` had shipped but had never executed once against prod, so
the monitor was trusted on the strength of having compiled. `status` returned
"no run recorded" for all three jobs, which looks identical to three dead
crons and was in fact just a 33-minute-old deploy: the code landed at 16:07
UTC and `crons.interval` restarts its clock from the deploy, so the first
six-hourly window was still hours away.

Rather than wait for it, `crawlJobs` was triggered by hand at 16:48 UTC. It is
the cheapest and safest of the three — Greenhouse's JSON list endpoint, no
Firecrawl, and it does not touch the news feed, which is the demo.

```
npx convex run jobs:crawlJobs "{limit:25}" --prod
```

| Checked | Result |
| --- | --- |
| `recordRun` writes a row | Yes: `ok: true`, `shortlisted 25, queued 25`, `2026-09-21T16:48:10.028Z` |
| `status` reads it back | Yes, under "crawl jobs"; the other two still correctly say no run |
| Three feeds after | 8 / 17 / 10, unchanged |

The run is also a clean demonstration of the rule in §3 that `ok` is judged on
what a run **found**, never on what it saved. Five boards returned 1,807 open
roles, 25 survived the title filter, all 25 were handed to `saveRawStory` —
and **none** were saved, because every one was already in the table.
Found 25, saved 0, `ok: true`. Judging on saved would have called a perfectly
healthy run a failure.

It settled a second question on the way. The jobs table already held `job`
rows created at 09:55 and 15:49 UTC that day, the second of them about twenty
minutes *before* the step 67 deploy. The crons had been running normally all
along; only the recording of them was new. "No run recorded" meant exactly
what it said and nothing worse.

---

## 5b. The email loop, verified end to end on production

2026-09-21. The one flow AUDIT has carried as unproven since E-1 was fixed:
mail that reaches a real mailbox, a reply written by a person, a grade that
comes back. Now also an emailed question answered by Ask FlipSec.

Run against `cerus112016@gmail.com`, a real mailbox, with a fresh subscriber
each round so the one-graded-answer-per-drill guard did not mask a result.

| Checked | Evidence |
| --- | --- |
| Drill delivered | Arrived in the inbox, not spam |
| Reply matched to the right drill | attempt `j57584q00ezmxdpj4n7bk9n3298ev08e` on drill `j9792z4kp96...`, matched by `in_reply_to` against `sentDrills` |
| Graded | `correct: true`, feedback written, logged `graded ... correct=true` at 2:01:09 PM |
| Grade delivered **in the thread** | `deliveryStatus: "sent"`, attempt 1 of 5, message id `<010001a0c5c5cea6-...>`; visible under the reader's own reply |
| Emailed question answered | Answered in the same thread, with the previous turn remembered |
| `emailAsk` budget recording | Three rows in `toolChecks` under kind `emailAsk` |
| No errors | Production logs across the whole exchange carry no send failure |

Grade turnaround was 1.5 seconds from graded to sent.

### Three rounds of testing that each looked like a broken pipeline

Worth recording, because all three were the same class of fault and none of
them was the thing first suspected.

**Round one blamed deliverability.** The grade was accepted by AgentMail with
an SES message id and never seen. SPF/DKIM/DMARC being unverified made that a
plausible story and it was wrong: the AgentMail dashboard showed the message
delivered, and the four bounces on the account were all to `.invalid` audit
addresses, not to a real inbox.

**Round two blamed the provider.** `sendGrade` called `messages/send`, which
always creates a NEW message with its own subject, so the grade landed in a
separate conversation while the reader watched the one they had replied in.
Delivered every time, in the wrong place.

**Round three was an argument that stopped halfway.** `replyToMessageId` has
to cross five scheduled hops. Four were wired. `gradeReply` accepted it and
did not pass it to `saveGrade`, so `sendGrade` saw `undefined` and took the
fallback. Nothing failed, because a grade with no anchor is SUPPOSED to go out
as its own message rather than not go out at all.

The diagnostic that worked was noticing that emailed QUESTIONS threaded and
grades did not, and that the question path is the one hop that skips
`gradeReply`. CLAUDE.md carries the rule: when one path through a feature
works and a near-identical one does not, diff the hops rather than the
behaviour — and a deliberate fallback will hide a broken chain from the logs,
the tests and the recipient alike.

### Still not proven by this

Deliverability to a cold mailbox. Everything above went to Gmail accounts that
had already received mail from this sender. SPF, DKIM and DMARC remain
unverified on the sending domain and item 8 stands.

---

## 6. H-2: security headers — OPEN, and why

Live response headers carry **only** `x-content-type-options: nosniff`.
Missing: `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`.

The clickjacking gap is the concrete one: the site can be framed, and being
framed inside a scam page is a credibility attack on a security-education
site specifically.

**This cannot be fixed from the repository.** `@convex-dev/static-hosting`
serves files with fixed headers and exposes no configuration hook —
`dist/component/http.js` builds the header object inline. Re-checked against
`0.2.1` on 2026-09-21: still inline, still no hook.

**It also cannot be fixed from a Cloudflare dashboard, which an earlier
version of this section got wrong.** A live response does carry
`Server: cloudflare`, and that is what the first reading of this finding was
based on — but the site is served from `hallowed-nightingale-322.convex.site`,
which is **Convex's** domain in **Convex's** Cloudflare account. There is no
zone here to add a Transform Rule to. The rule below is correct and there is
currently nowhere to put it.

So H-2 is blocked behind item 5 of §8, the custom domain, and is a larger
change than "add a header": a domain this project controls, fronted by a CDN
this project controls, and the absolute URLs in `index.html`,
`public/sitemap.xml` and `public/robots.txt` all moving with it — see §3,
*The absolute URLs move together*. That is not a change to make against a
deadline, which is why it is still open rather than newly urgent.

The starter policy below is kept because it is the researched part and it
stays valid wherever the headers eventually get set.

A CSP was deliberately **not** added as a `<meta http-equiv>` tag. `frame-ancestors`
is ignored in meta CSP, so it would not fix the clickjacking gap anyway, and
an enforcing CSP cannot be verified without a browser. Getting `connect-src`
wrong breaks every feed on the site.

Starter policy for the Cloudflare rule, from the origins this app actually
uses:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://hallowed-nightingale-322.convex.cloud wss://hallowed-nightingale-322.convex.cloud;
media-src 'self' https://hallowed-nightingale-322.convex.cloud;
frame-ancestors 'none';
base-uri 'none';
```

Three of those lines are load-bearing and easy to get wrong:

- **`wss:` in `connect-src`** — Convex reactive queries are a WebSocket.
  Omit it and every feed goes blank.
- **`media-src`** — Read aloud plays audio from Convex file storage.
- **`img-src ... https:`** — card artwork is `og:image` from arbitrary source
  domains.

Deploy as `Content-Security-Policy-Report-Only` first, open every view, then
enforce.

---

## 7. Open, deliberately

**S-3, URL routing — partly closed.** `src/navigation.ts` now syncs the view,
the feed and a card to the location hash, so deep links, refresh and the
browser's Back and Forward all work, and an unrecognised hash shows a
recovery state rather than silently landing on home. Three headless-Chrome
checks cover exactly that. CLAUDE.md no longer says a router "does not earn
itself"; it describes the hash routing instead, and this section used to
quote the old sentence back.

What is **still open** is the part hash routing cannot reach. The fragment is
never sent to the server, so there is still **one indexable URL**, no
per-card search indexing, and unknown paths still return **HTTP 200** with
the app shell rather than a 404 — that last one belongs to the hosting layer,
which serves fixed responses, the same constraint as H-2 in §6. It remains
the largest SEO limitation.

**L-3, `List-Unsubscribe`.** Gmail and Yahoo have required it for bulk
senders since 2024. Not added because the AgentMail REST send endpoint's
support for custom headers could not be confirmed from here, and sending an
unsupported field risks breaking the daily send. Verify against AgentMail's
API docs, then add `List-Unsubscribe` and
`List-Unsubscribe-Post: List-Unsubscribe=One-Click` in `email.ts`.

**L-4, language dictionaries.** All eleven ship to every reader. A dynamic
`import()` per language is the cheapest remaining bundle win.

**L-5, Google Fonts.** Render-blocking third-party stylesheet. Self-hosting
Source Sans 3 removes a DNS + TLS round-trip from first paint, removes a CSP
exception, and removes the German-court question about transmitting visitor
IPs to Google. One change, three benefits.

---

## 8. Manual verification, still outstanding

| # | Verify | How |
| --- | --- | --- |
| 1 | **Rotate every API key** | OpenAI, Firecrawl, AgentMail, and the `whsec_` signing secret all appeared in terminal sessions. Deliberately deferred by the project owner to be done last. |
| 2 | Prod env vars set | **Verified 2026-09-21**: all six present, `AGENTMAIL_WEBHOOK_SECRET` included, so the inbound route is not failing closed and reply grading runs. Re-check with `npx convex env list --prod` after any key rotation. **Never print values.** |
| 3 | Security headers | **Blocked behind item 5.** Needs a custom domain on a CDN this project controls; `*.convex.site` is Convex's zone, so there is no Transform Rule to add. §6. |
| 4 | HSTS | Same block as item 3, and the same reason. |
| 5 | Custom domain | Currently `*.convex.site`. Decide before the absolute URLs harden — and note items 3 and 4 both wait on it. |
| 6 | Backups | Convex dashboard → Settings → Backups. **Test a restore**; an untested backup is a hypothesis. |
| 7 | Failure alerting | **Partly closed `46e3dc2`, and now verified.** Every cron records what it achieved, and `npx convex run health:status --prod` reports the last run of each. That is detection, not notification: nothing pages anybody, so it only helps if somebody looks. §3 says what must not be tidied. Proven end to end on prod 2026-09-21 — see §5a. |
| 8 | SPF / DKIM / DMARC | **Blocked behind owning a domain**, which the project owner has deferred until after judging. Until then the mitigation is honesty: the sign-up form, the success screen and the confirm page all say the first email often lands in spam. On the AgentMail sending domain. Without DKIM the daily send lands in spam. **2026-09-21: now the leading suspect for a real failure, not a theoretical one.** A drill sent at 19:58 UTC arrived; the grade reply for it, sent at 20:02 UTC, was accepted by AgentMail with SES message id `<010001a0c5900170-...>` and `deliveryStatus: "sent"`, and never appeared in the recipient's inbox or spam. `deliveryStatus` records that AgentMail ACCEPTED the message, never that a mailbox received it, and `messages/send` is the only AgentMail call in the codebase, so nothing here can see a bounce. Check that message id in the AgentMail dashboard. |
| 14 | **`sendTestDrill` sends the same drill all day** | `pickTodaysDrill` is a single global pick, so two test drills on the same day carry the same `drillId`. The one-graded-answer-per-reader-per-drill guard then silently drops the second reply — correct behaviour, invisible outcome. Observed 2026-09-21: a second reply produced no attempt row and no grade. To retest the reply loop the same day, use a different subscriber address, not a second send to the same one. |
| 9 | Webhook URL | `https://<deployment>.convex.site/api/agentmail-inbound`, plus one real reply end to end. **Done 2026-09-21, see §5b:** several real replies, graded and answered, signature verified on every one. |
| 10 | **Double opt-in, end to end** | Sign up with your own address, confirm the mail arrives, press the button, check `pending` clears. Drill and reply delivery to real mailboxes is now proven (§5b), but the CONFIRMATION message and the `pending` transition still have not been walked by hand. |
| 11 | Cron timing | `0 14 * * *` is **UTC** — 7am PT. Confirm that is intended. |
| 12 | Mobile at 320px | **Closed, and now measured in a browser.** The Accessibility dropdown was `w-72` (288px) `absolute right-0`, with nothing to spare at a 320px viewport; it now carries `max-w-[calc(100vw-2rem)]`, compiled rule confirmed. Headless Chrome at 320, 390 and 1280 wide on 2026-09-21 found **no horizontal scroll at any width**. The earlier "needs one look on a real handset" is now narrowed to touch behaviour and real-device font rendering, which a headless browser cannot speak for. |
| 15 | **Focus Not Obscured (WCAG 2.2 SC 2.4.11)** | **Handled when the risk was introduced, not after.** The feed tabs became sticky under an already-sticky header, and a sticky bar sitting over the next card down is exactly what 2.4.11 forbids. `#main`, `.post` and every `story-*` element carry `scroll-margin-top: calc(var(--header-h) + var(--tabs-h) + 1rem)`, both values measured by `ResizeObserver` rather than hardcoded, because the header wraps at narrow widths and both grow with zoom and the larger-text preference. Also fixes a card permalink landing underneath the chrome. |
| 13 | **Language of Parts (WCAG 2.2 SC 3.1.2)** | **Closed in code.** `<html lang>` follows the reader's choice, but Home, About, Privacy, the sign-up form and all four interactive lessons are still written in English, so they were English text declared as Spanish, Japanese or Hindi — a screen reader read them through the wrong voice. Each now declares `lang="en"`, and `ReadAloudButton` declares the reader's language back. Delete each `lang="en"` when that region is actually translated. |
