# FlipSec

FlipSec is an AI security awareness app for ordinary people. The feed looks like
social media and carries real stories about AI being used against people. Flip any
post and it becomes a drill built from that exact story, so the practice arrives
while the context is still in the reader's head.

**Stack:** React, Vite, TypeScript, Tailwind, Convex, OpenAI, Firecrawl, AgentMail.

## Architecture rules

- Actions do network calls only. They never touch `ctx.db`.
- Actions reach the database by scheduling mutations via `ctx.scheduler.runAfter`.
- Mutations are transactions. They never fetch.
- Every lookup uses `withIndex`. No table scans.
- All AI and crawl functions are `internalAction`, never public `action`. They must
  not be callable from the client.
- Secrets live in Convex env vars only. Never hardcode a key, never commit one.

## Content rules

- Never display `rawText`. Crawl it, process it, show only the generated summary.
- Clear `rawText` once the story is published.
- Summaries must be original phrasing. No reused phrases from the source.
- Every post links its source, with the source name visible.
- Primary sources are public-domain government advisories (FTC, CISA, FBI IC3).

## Voice

Plain language at a 7th grade reading level. Sentence case. Plain verbs, no jargon.
If a 7th grader would not use the word, it does not go on the post.

## Spec

See PLAN.md for the full spec. Do not build anything listed in PLAN.md section 15.
