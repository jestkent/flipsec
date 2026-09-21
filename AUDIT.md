# Production readiness audit

Audit run 2026-09-21 against commit `a0910d6` and the live deployment.
Fixes are commits `c233aa8`, `9c59bec`, `877f7dc`, `f8235ec`.

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
| **H-2** | **No security headers** — no CSP, HSTS, or frame protection | **High** | **OPEN — hosting layer, see §6** |
| S-3 | No URL routing: one indexable URL, back button inert, soft 404 | Medium | **OPEN — deferred, see §7** |
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

The README also claimed emailed replies "come back graded". The grading runs
and the result is stored on the attempt, but **nothing is sent back** —
`gradeReply` has zero mail calls. The claim is corrected; the gap is open.

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
| all | Three feeds after every deploy | 6 / 11 / 10 unchanged |

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

## 6. H-2: security headers — OPEN, and why

Live response headers carry **only** `x-content-type-options: nosniff`.
Missing: `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`.

The clickjacking gap is the concrete one: the site can be framed, and being
framed inside a scam page is a credibility attack on a security-education
site specifically.

**This cannot be fixed from the repository.** `@convex-dev/static-hosting`
serves files with fixed headers and exposes no configuration hook —
`dist/component/http.js` builds the header object inline. Cloudflare sits in
front, so the fix is a Transform Rule there.

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

**S-3, URL routing.** Views live in `App.tsx` state with no `pushState`.
Consequences: one indexable URL, no deep links, back button does not move
between views, unknown paths return **HTTP 200** with the app shell (a soft
404). `CLAUDE.md` records that a router "still does not earn itself", and
adding URL sync touches the navigation every other feature depends on. Not a
change to make unverified against a deadline. It is the largest remaining
SEO limitation.

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
| 2 | Prod env vars set | `npx convex env list --prod`. If `AGENTMAIL_WEBHOOK_SECRET` is unset the inbound route fails closed and reply grading stops silently. **Never print values.** |
| 3 | Security headers | Cloudflare Transform Rule, §6. |
| 4 | HSTS | Cloudflare → SSL/TLS → Edge Certificates. |
| 5 | Custom domain | Currently `*.convex.site`. Decide before the absolute URLs harden. |
| 6 | Backups | Convex dashboard → Settings → Backups. **Test a restore**; an untested backup is a hypothesis. |
| 7 | Failure alerting | None exists. A broken cron currently fails silently for days. |
| 8 | SPF / DKIM / DMARC | On the AgentMail sending domain. Without DKIM the daily send lands in spam. |
| 9 | Webhook URL | `https://<deployment>.convex.site/api/agentmail-inbound`, plus one real reply end to end. |
| 10 | **Double opt-in, end to end** | Not verified with a real mailbox. Sign up with your own address, confirm the mail arrives, press the button, check `pending` clears. This is the one new flow that has never delivered a real message. |
| 11 | Cron timing | `0 14 * * *` is **UTC** — 7am PT. Confirm that is intended. |
| 12 | Mobile at 320px | The Accessibility dropdown is `w-72` (288px) and `absolute right-0`. |
