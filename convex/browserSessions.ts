import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, internalQuery, internalMutation, type QueryCtx } from "./_generated/server";
import { reserveSlot } from "./rateLimit";

const LIFETIME = 7 * 24 * 60 * 60 * 1000;

async function digest(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// A public reader ID is never a credential. Only the server-issued secret
// resolves to the owner; the database stores its hash, not the secret.
export async function sessionOwner(ctx: QueryCtx, token?: string): Promise<string | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = await digest(token);
  const row = await ctx.db.query("browserSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash)).unique();
  return row && row.expiresAt > Date.now() ? `session:${row._id}` : null;
}

export const create = mutation({
  args: {},
  returns: v.object({ token: v.string(), expiresAt: v.number() }),
  handler: async (ctx) => {
    // Issuance has its own global ceiling, independent of AI budgets.
    if (!(await reserveSlot(ctx, "session", "session-issuance", "session"))) {
      throw new Error("New conversations are busy. Please try again later.");
    }
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const expiresAt = Date.now() + LIFETIME;
    const id = await ctx.db.insert("browserSessions", { tokenHash: await digest(token), expiresAt });
    // Removing the row invalidates subscribed queries reactively as well as actions.
    await ctx.scheduler.runAfter(LIFETIME, internal.browserSessions.expire, { id });
    return { token, expiresAt };
  },
});

export const owner = internalQuery({
  args: { token: v.optional(v.string()) },
  returns: v.union(v.string(), v.null()),
  handler: (ctx, args) => sessionOwner(ctx, args.token),
});

export const expire = internalMutation({
  args: { id: v.id("browserSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await ctx.db.get(args.id)) await ctx.db.delete(args.id);
    const threads = await ctx.db.query("assistantThreads")
      .withIndex("by_user_time", (q) => q.eq("userId", `session:${args.id}`)).take(20);
    for (const thread of threads) {
      await ctx.db.delete(thread._id);
      await ctx.scheduler.runAfter(0, internal.assistant.deleteExpiredThread, { threadId: thread.threadId });
    }
    if (threads.length === 20) await ctx.scheduler.runAfter(0, internal.browserSessions.expire, args);
    return null;
  },
});
