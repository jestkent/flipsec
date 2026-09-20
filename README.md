# FlipSec

**Flip the news. Learn the threat.** A security awareness feed where every post
flips into a drill built from that exact story.

**Live URL:** TBD

## What it does

FlipSec crawls government consumer-protection advisories every six hours and turns
each one into a short, plain-language post about an AI scam that is hitting real
people. Flip the post and it becomes a practice question built from that same
story, so you practice spotting the thing that actually just happened.

## Built with

Convex, Firecrawl, OpenAI, AgentMail.

## Sources and content

FlipSec publishes original summaries and links to sources. It does not republish
article text. Primary sources are public-domain government advisories.

## Local setup

```bash
# scaffold
npm create vite@latest flipsec -- --template react-ts
cd flipsec
npm install
npm install convex
npx convex dev

# tailwind
npm install -D tailwindcss @tailwindcss/vite

# integrations
npm install @mendable/firecrawl-js openai

# secrets (never commit these)
npx convex env set OPENAI_API_KEY sk-...
npx convex env set FIRECRAWL_API_KEY fc-...
npx convex env set AGENTMAIL_API_KEY ...
```
