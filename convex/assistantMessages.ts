import { listUIMessages } from "@convex-dev/agent";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { sessionOwner } from "./browserSessions";

const messageValidator = v.object({
  id: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  text: v.string(),
});

export const list = query({
  args: { userId: v.optional(v.string()), sessionToken: v.optional(v.string()), threadId: v.string() },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    const userId = await sessionOwner(ctx, args.sessionToken);
    if (!userId) return [];
    const owner = await ctx.db
      .query("assistantThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .unique();
    if (!owner || owner.userId !== userId) return [];

    const page = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 50 },
    });

    return page.page
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant",
        text: message.text,
      }));
  },
});
