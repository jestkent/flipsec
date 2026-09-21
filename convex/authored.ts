import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Lesson cards the app writes itself, rather than crawling and summarising
// somebody else's page.
//
// Section 5's content rules exist because everything else here is derived
// from a source: original phrasing only, never the source's text, always
// attribute and link out. None of that binds an authored card, because there
// is nothing to attribute — the words are ours. What does still bind is the
// rest of the feed's contract: it has to earn its place beside the crawled
// guides, and a reader has to be able to tell where it came from, which is
// why `source` says FlipSec.ai rather than borrowing somebody's name.
//
// `url` points at OWASP's write-up of the risk. The lesson is ours; the
// concept is theirs to define, and a reader who wants the authoritative
// version should be one tap away from it.
//
// These rows skip the crawler and the gates entirely. That is the point:
// gates exist to judge material nobody here chose, and these were chosen.
// It also means nothing here is checked by a model, so the card is only as
// good as the person who wrote it.

const CARDS = [
  {
    key: "demo-prompt-injection",
    title: "Your AI assistant will do what your email tells it to",
    summary:
      "An assistant that reads your messages cannot tell the difference between what you asked it to do and what it is reading. Anyone who writes to you can leave it instructions. Try it on three messages and watch one of them take over.",
    source: "FlipSec.ai",
    url: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
    tactic: "injection",
    back: { demo: "prompt-injection" },
  },
];

// Idempotent on `url`, which is the same key the crawler dedupes on, so
// running this twice updates rather than duplicating.
export const seedLessons = internalMutation({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const done: string[] = [];

    for (const card of CARDS) {
      const existing = await ctx.db
        .query("stories")
        .withIndex("by_url", (q) => q.eq("url", card.url))
        .unique();

      const row = {
        url: card.url,
        title: card.title,
        source: card.source,
        summary: card.summary,
        tactic: card.tactic,
        kind: "course",
        back: card.back,
        status: "published",
        publishedAt: existing?.publishedAt ?? Date.now(),
        crawledAt: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, row);
        done.push(`updated ${card.key}`);
      } else {
        await ctx.db.insert("stories", row);
        done.push(`inserted ${card.key}`);
      }
    }

    return done;
  },
});

// Takes an authored card back out of the feed without touching anything the
// crawler owns. Deliberately separate from stories.unpublish so a mistake
// here cannot reach a crawled row.
export const removeLesson = internalMutation({
  args: { url: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("stories")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
    if (!row || row.source !== "FlipSec.ai") return false;
    await ctx.db.delete(row._id);
    return true;
  },
});
