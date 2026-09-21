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
