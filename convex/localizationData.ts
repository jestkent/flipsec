import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

const language = v.union(v.literal("es"), v.literal("fil"));
const speechLanguage = v.union(v.literal("en"), v.literal("es"), v.literal("fil"));

export const story = query({
  args: { storyId: v.id("stories"), language },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("storyTranslations")
      .withIndex("by_story_language", (q) => q.eq("storyId", args.storyId).eq("language", args.language))
      .unique();
    return row?.content ?? null;
  },
});

export const storySource = internalQuery({
  args: { storyId: v.id("stories"), language },
  returns: v.union(v.null(), v.object({ source: v.any(), cached: v.union(v.null(), v.any()) })),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.storyId);
    if (!source || source.status !== "published") return null;
    const cached = await ctx.db
      .query("storyTranslations")
      .withIndex("by_story_language", (q) => q.eq("storyId", args.storyId).eq("language", args.language))
      .unique();
    const drill = await ctx.db.query("drills").withIndex("by_story", (q) => q.eq("storyId", args.storyId)).unique();
    return {
      cached: cached?.content ?? null,
      source: {
        title: source.title,
        summary: source.summary ?? "",
        redFlags: source.redFlags ?? [],
        back: source.back ?? null,
        drill: drill ? {
          prompt: drill.prompt,
          choices: drill.choices,
          explanation: drill.explanation,
          steps: drill.steps ?? [],
          whyItWorks: drill.whyItWorks ?? "",
          illusion: drill.illusion ?? [],
        } : null,
      },
    };
  },
});

export const saveStory = internalMutation({
  args: { storyId: v.id("stories"), language, content: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("storyTranslations")
      .withIndex("by_story_language", (q) => q.eq("storyId", args.storyId).eq("language", args.language))
      .unique();
    if (!existing) await ctx.db.insert("storyTranslations", { ...args, createdAt: Date.now() });
    return null;
  },
});

export const speech = internalQuery({
  args: { contentHash: v.string(), language: speechLanguage },
  returns: v.union(v.null(), v.id("_storage")),
  handler: async (ctx, args) => {
    const row = await ctx.db.query("speechAudio")
      .withIndex("by_hash_language", (q) => q.eq("contentHash", args.contentHash).eq("language", args.language))
      .unique();
    return row?.storageId ?? null;
  },
});

export const saveSpeech = internalMutation({
  args: { contentHash: v.string(), language: speechLanguage, storageId: v.id("_storage") },
  returns: v.id("_storage"),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("speechAudio")
      .withIndex("by_hash_language", (q) => q.eq("contentHash", args.contentHash).eq("language", args.language))
      .unique();
    if (existing) {
      await ctx.storage.delete(args.storageId);
      return existing.storageId;
    }
    await ctx.db.insert("speechAudio", { ...args, createdAt: Date.now() });
    return args.storageId;
  },
});

export const reserveSpeech = internalMutation({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (args.userId.length < 1 || args.userId.length > 100) return false;
    const since = Date.now() - 60 * 60 * 1000;
    const mine = await ctx.db.query("toolChecks")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId).gt("createdAt", since)).take(20);
    if (mine.length >= 20) return false;
    const all = await ctx.db.query("toolChecks").withIndex("by_time", (q) => q.gt("createdAt", since)).take(300);
    if (all.length >= 300) return false;
    await ctx.db.insert("toolChecks", { userId: args.userId, kind: "speech", createdAt: Date.now() });
    return true;
  },
});
