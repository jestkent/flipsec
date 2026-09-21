import { v } from "convex/values";
import { internalMutation, internalQuery, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { reserveSlot } from "./rateLimit";

import { language, speechLanguage } from "./languages";

export const story = query({
  args: { storyId: v.id("stories"), language },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("storyTranslations")
      .withIndex("by_story_language", (q) => q.eq("storyId", args.storyId).eq("language", args.language))
      .unique();
    const source = await translationSource(ctx, args.storyId);
    return source && row && matchesTranslation(source, row.content) &&
      (!row.sourceHash || row.sourceHash === await sourceHash(source)) ? row.content : null;
  },
});

// `back.demo` names an interactive lesson in the client's demoRegistry. It is
// a database value, matched exactly, and it is the one thing on a back that
// must NOT be translated: a translated key matches nothing, and the card then
// renders a course back with no course fields behind it.
//
// The reader-facing half of this is fixed in Post.tsx, which reads the key
// from the untranslated row. This is the other half -- there is no reason to
// spend a model call corrupting a value nobody reads from here.
function withoutDemoKey(back: unknown): unknown {
  if (typeof back !== "object" || back === null || Array.isArray(back)) {
    return back ?? null;
  }
  const rest: Record<string, unknown> = { ...(back as Record<string, unknown>) };
  delete rest.demo;
  return rest;
}

// Validate the generated structure rather than trusting a JSON-mode prompt.
// Array order is requested from the model; lengths, keys and value types are
// enforced here. URLs and numeric values must remain unchanged.
export function matchesTranslation(source: unknown, translated: unknown): boolean {
  if (source === null) return translated === null;
  if (typeof source === "string") return typeof translated === "string" &&
    (!/^https?:\/\//.test(source) || translated === source);
  if (Array.isArray(source)) return Array.isArray(translated) && source.length === translated.length &&
    source.every((value, index) => matchesTranslation(value, translated[index]));
  if (typeof source === "object") {
    if (!translated || typeof translated !== "object" || Array.isArray(translated)) return false;
    const left = source as Record<string, unknown>;
    const right = translated as Record<string, unknown>;
    return Object.keys(left).length === Object.keys(right).length &&
      Object.keys(left).every((key) => Object.hasOwn(right, key) && matchesTranslation(left[key], right[key]));
  }
  return source === translated;
}

async function sourceHash(source: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(source)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function translationSource(ctx: QueryCtx, storyId: Id<"stories">) {
  const source = await ctx.db.get(storyId);
  if (!source || source.status !== "published") return null;
  const drill = await ctx.db.query("drills").withIndex("by_story", (q) => q.eq("storyId", storyId)).unique();
  // A published news front is visible while its lesson is being generated.
  // Do not cache that temporary, incomplete state in any language.
  if ((source.kind ?? "scam") === "scam" && !drill) return null;
  return {
    title: source.title, summary: source.summary ?? "", redFlags: source.redFlags ?? [],
    back: withoutDemoKey(source.back),
    drill: drill ? {
      prompt: drill.prompt, choices: drill.choices, explanation: drill.explanation,
      steps: drill.steps ?? [], whyItWorks: drill.whyItWorks ?? "", illusion: drill.illusion ?? [],
    } : null,
  };
}

export const storySource = internalQuery({
  args: { storyId: v.id("stories"), language },
  returns: v.union(v.null(), v.object({ source: v.any(), sourceHash: v.string(), cached: v.union(v.null(), v.any()) })),
  handler: async (ctx, args) => {
    const source = await translationSource(ctx, args.storyId);
    if (!source) return null;
    const cached = await ctx.db
      .query("storyTranslations")
      .withIndex("by_story_language", (q) => q.eq("storyId", args.storyId).eq("language", args.language))
      .unique();
    const hash = await sourceHash(source);
    return {
      cached: cached && matchesTranslation(source, cached.content) && (!cached.sourceHash || cached.sourceHash === hash) ? cached.content : null,
      source, sourceHash: hash,
    };
  },
});

export const saveStory = internalMutation({
  args: { storyId: v.id("stories"), language, content: v.any(), sourceHash: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const source = await translationSource(ctx, args.storyId);
    if (!source) throw new Error("This lesson is not ready for translation yet.");
    const hash = await sourceHash(source);
    if ((args.sourceHash && args.sourceHash !== hash) || !matchesTranslation(source, args.content)) {
      throw new Error("The translation does not match the complete current card.");
    }
    const existing = await ctx.db
      .query("storyTranslations")
      .withIndex("by_story_language", (q) => q.eq("storyId", args.storyId).eq("language", args.language))
      .unique();
    const value = { ...args, sourceHash: hash, createdAt: Date.now() };
    if (!existing) await ctx.db.insert("storyTranslations", value);
    else if (!matchesTranslation(source, existing.content) || (existing.sourceHash && existing.sourceHash !== hash)) {
      await ctx.db.patch(existing._id, value);
    }
    return null;
  },
});

// Published stories that have no row for the given language yet. Used by
// the backfill, and useful on its own for answering "is the feed actually
// fully translated" without reading every card by hand.
export const untranslated = internalQuery({
  args: { language },
  returns: v.array(v.id("stories")),
  handler: async (ctx, args) => {
    const published = await ctx.db
      .query("stories")
      .withIndex("by_published", (q) => q.eq("status", "published"))
      .take(500);

    const missing: Array<Id<"stories">> = [];
    for (const story of published) {
      const row = await ctx.db
        .query("storyTranslations")
        .withIndex("by_story_language", (q) =>
          q.eq("storyId", story._id).eq("language", args.language),
        )
        .unique();
      const source = await translationSource(ctx, story._id);
      if (source && (!row || !matchesTranslation(source, row.content) || (row.sourceHash && row.sourceHash !== await sourceHash(source)))) missing.push(story._id);
    }
    return missing;
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

// A translation is only paid for on a cache miss, so this is reserved after
// the cache is checked, never before. A reader switching language on a feed
// that is already translated spends nothing and is never rate limited.
export const reserveTranslation = internalMutation({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => reserveSlot(ctx, "translate", args.userId, "translate"),
});

export const reserveSpeech = internalMutation({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => reserveSlot(ctx, "speech", args.userId, "speech"),
});
