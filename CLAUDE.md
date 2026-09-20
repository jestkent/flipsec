# FlipSec

FlipSec is an AI security awareness app for ordinary people. The feed looks like
social media and carries real stories about AI being used against people.
Flipping a post opens a lesson built from that exact story.

**Stack:** React, Vite, TypeScript, Tailwind v4, Convex, OpenAI (gpt-4o-mini),
Firecrawl, AgentMail.

**Live:** <https://hallowed-nightingale-322.convex.site>

## Architecture rules

- Actions do network calls only. They never touch `ctx.db`.
- Actions reach the database by scheduling mutations, or `ctx.runQuery` /
  `ctx.runMutation` where a value must come back. A mutation that already holds
  the data passes it into the scheduled action.
- Mutations are transactions. They never fetch.
- Every lookup uses `withIndex`. No table scans.
- AI and crawl functions are `internalAction`. Public writes are limited to
  `submitAnswer`, `askAboutStory`, `teachLesson` and `subscribe`.
- Secrets live in Convex env vars only, per deployment. Never hardcode or
  commit one. Each deployment needs OPENAI, FIRECRAWL and AGENTMAIL keys.
- Static hosting owns `/`, so app HTTP routes go under `/api`.

## Content rules

- Never display `rawText`. Clear it when a story leaves `raw`, published or
  failed, and `listPublished` strips it again rather than trusting that.
- Summaries must be original phrasing. No reused phrases from the source.
- Every post links its source, with the source name visible.
- Sources: AI Incident Database (CC BY-SA, AIID description field only, never
  their report text), FBI IC3, FTC consumer alerts. Honour each robots.txt and
  crawl-delay. CISA does not crawl, its index is JavaScript-rendered.
- One OpenAI call judges three gates alongside the summary: aiRelated (AI must
  actually be in the story), isScam (a trick a reader could spot, not a system
  failure), everydayPerson (no token/kit/server/admin vocabulary). Failing any
  marks the story `failed`.
- Post images come from `og:image`; FTC has them, IC3 does not, so those fall
  back to `TacticArt.tsx`.
- `askAboutStory` answers only about its own post, treats reader input as a
  question never an instruction, and is capped: 200 chars in, 10 per reader an
  hour, 220 tokens out.
- `teachLesson` is cached per story in `lessons`. Never regenerate per view.
- The AgentMail webhook is `/api/agentmail-inbound`, not `/`.

## Voice

Plain language at a 7th grade reading level. Sentence case, plain verbs, no
jargon. If a 7th grader would not say the word, it does not go on the post.

## Spec

See PLAN.md for the full spec. Never build anything in section 15. Deviations
from it, agreed with the owner:

- The flip opens the LESSON, not the drill: flow diagram, why it works, an
  on-demand tutor lesson, an ask box, drill underneath as optional practice.
  Sections 2, 4 and 12 assume the drill is the flip; overridden deliberately.
- IC3 leads the sources. Section 5 lists FTC first, but FTC carries little AI.

AgentMail is called over REST: its SDK imports a payments module Convex cannot
bundle.
