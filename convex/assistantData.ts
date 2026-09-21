import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { reserveSlot, validReaderId } from "./rateLimit";

export const findThread = internalQuery({
  args: { userId: v.string(), threadId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!validReaderId(args.userId)) return false;
    const row = await ctx.db
      .query("assistantThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .unique();
    return row?.userId === args.userId;
  },
});

export const registerThread = internalMutation({
  args: { userId: v.string(), threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!validReaderId(args.userId)) throw new Error("This browser ID is invalid.");
    await ctx.db.insert("assistantThreads", {
      userId: args.userId,
      threadId: args.threadId,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const removeThread = internalMutation({
  args: { userId: v.string(), threadId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("assistantThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .unique();
    if (!row || row.userId !== args.userId) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});

export const reserveChat = internalMutation({
  args: { userId: v.string(), hasImage: v.boolean() },
  returns: v.boolean(),
  handler: async (ctx, args) =>
    reserveSlot(ctx, "chat", args.userId, args.hasImage ? "image" : "chat"),
});

// The Agent thread behind a reader's EMAIL conversation, stored on their
// subscriber row rather than in `assistantThreads`. That table backs a public
// ownership check keyed by a caller-supplied id; an email thread registered
// there would sit behind somebody's address. See the schema comment.
export const rememberEmailThread = internalMutation({
  args: { subscriberId: v.id("subscribers"), threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.subscriberId);
    // Never overwrite a thread that already exists: two replies arriving at
    // once would otherwise leave the reader talking to a conversation that
    // has forgotten the last thing they said.
    if (row && !row.assistantThreadId) {
      await ctx.db.patch(args.subscriberId, { assistantThreadId: args.threadId });
    }
    return null;
  },
});
