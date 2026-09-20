import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Insert a freshly crawled article. Deduped on url via the by_url index so a
// re-crawl of the same source does not create a second copy.
export const saveRawStory = internalMutation({
  args: {
    url: v.string(),
    title: v.string(),
    source: v.string(),
    sourceIcon: v.optional(v.string()),
    rawText: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stories")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();

    if (existing !== null) {
      return null;
    }

    const storyId = await ctx.db.insert("stories", {
      url: args.url,
      title: args.title,
      source: args.source,
      sourceIcon: args.sourceIcon,
      rawText: args.rawText,
      status: "raw",
      crawledAt: Date.now(),
    });

    return storyId;
  },
});
