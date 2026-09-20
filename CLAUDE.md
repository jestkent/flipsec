# FlipSec

FlipSec is an AI security awareness app for ordinary people. The feed looks like
social media and carries real stories about AI being used against people. Flip a
post and it becomes a drill built from that story, then a short lesson, so the
practice arrives while the context is still in the reader's head.

**Stack:** React, Vite, TypeScript, Tailwind v4, Convex, OpenAI (gpt-4o-mini),
Firecrawl, AgentMail (not built yet).

**Live:** <https://hallowed-nightingale-322.convex.site>

## Architecture rules

- Actions do network calls only. They never touch `ctx.db`.
- Actions reach the database by scheduling mutations via `ctx.scheduler.runAfter`,
  or `ctx.runQuery` / `ctx.runMutation` where a value must come back. A mutation
  that already holds the data passes it into the scheduled action.
- Mutations are transactions. They never fetch.
- Every lookup uses `withIndex`. No table scans.
- All AI and crawl functions are `internalAction`. The only public functions are
  `attempts.submitAnswer` and `questions.askAboutStory`, both capped.
- Secrets live in Convex env vars only, per deployment. Never hardcode or commit
  one. Dev and prod each need `OPENAI_API_KEY` and `FIRECRAWL_API_KEY`.
- Static hosting owns `/`, so app HTTP routes go under `/api`.

## Content rules

- Never display `rawText`. `listPublished` strips it explicitly rather than
  trusting that publish cleared it.
- Clear `rawText` when the story leaves `raw`, published or failed.
- Summaries must be original phrasing. No reused phrases from the source.
- Every post links its source, with the source name visible.
- Sources are public-domain government advisories: FBI IC3 (primary, carries the
  AI stories) and FTC consumer alerts (secondary, better reading level). Check
  robots.txt per source and honour any crawl-delay. CISA does not crawl, its
  index is JavaScript-rendered.
- One OpenAI call per story judges AI-relatedness alongside the summary. Stories
  that are not about AI are marked `failed` and never reach the feed.
- Post images come from the source's `og:image` where it exists. FTC has them,
  IC3 does not, so those fall back to tactic art in `TacticArt.tsx`.
- `askAboutStory` answers only about its own post, treats reader input as a
  question never an instruction, and is capped: 200 chars in, 10 per reader per
  hour, 220 tokens out.
- `teachLesson` is cached per story in `lessons`. Never regenerate per view.

## Voice

Plain language at a 7th grade reading level. Sentence case, plain verbs, no
jargon. If a 7th grader would not use the word, it does not go on the post.

## Spec

See PLAN.md for the full spec. Never build anything in section 15. Deviations
from it, agreed with the owner:

- The flip opens the LESSON, not the drill: a tactic-tinted flow diagram, why
  the scam works, an on-demand tutor lesson and an ask box. The drill sits
  under it as optional practice. Sections 2, 4 and 12 assume the drill is the
  flip; the owner overrode that twice, deliberately.
- IC3 leads the sources. Section 5 lists FTC first, but FTC carries little AI.

Open issue: the AI filter rejects ~85% of crawled stories and still lets through
enterprise posts that fail the 7th grade bar.
