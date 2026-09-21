import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const MAX_PER_READER_HOUR = 10;
const MAX_GLOBAL_HOUR = 160;

function validReaderId(userId: string) {
  return userId.length >= 1 && userId.length <= 100;
}

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
  handler: async (ctx, args) => {
    if (!validReaderId(args.userId)) return false;
    const since = Date.now() - 60 * 60 * 1000;
    const mine = await ctx.db
      .query("toolChecks")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId).gt("createdAt", since))
      .take(MAX_PER_READER_HOUR);
    if (mine.length >= MAX_PER_READER_HOUR) return false;

    const all = await ctx.db
      .query("toolChecks")
      .withIndex("by_time", (q) => q.gt("createdAt", since))
      .take(MAX_GLOBAL_HOUR);
    if (all.length >= MAX_GLOBAL_HOUR) return false;

    await ctx.db.insert("toolChecks", {
      userId: args.userId,
      kind: args.hasImage ? "image" : "chat",
      createdAt: Date.now(),
    });
    return true;
  },
});
