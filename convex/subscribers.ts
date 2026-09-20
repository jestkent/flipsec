import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

// Public: a reader gives their address on the site. Deduped on by_email so
// signing up twice reactivates rather than creating a second row.
export const subscribe = mutation({
  args: { email: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@") || email.length > 200) {
      throw new Error("that does not look like an email address");
    }

    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing !== null) {
      if (!existing.active) await ctx.db.patch(existing._id, { active: true });
      return { already: true };
    }

    await ctx.db.insert("subscribers", {
      email,
      userId: args.userId,
      active: true,
    });
    return { already: false };
  },
});

export const listActive = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db
      .query("subscribers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(200);

    return subs.map((s) => ({ subscriberId: s._id, email: s.email }));
  },
});

// The newest published story that has a drill. Sent to everyone today.
export const pickTodaysDrill = internalQuery({
  args: {},
  handler: async (ctx) => {
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_published", (q) => q.eq("status", "published"))
      .order("desc")
      .take(10);

    for (const story of stories) {
      const drill = await ctx.db
        .query("drills")
        .withIndex("by_story", (q) => q.eq("storyId", story._id))
        .unique();

      if (drill !== null) {
        return {
          drillId: drill._id,
          storyId: story._id,
          prompt: drill.prompt,
          choices: drill.choices,
          source: story.source,
          url: story.url,
        };
      }
    }

    return null;
  },
});

export const markSent = internalMutation({
  args: {
    subscriberId: v.id("subscribers"),
    drillId: v.id("drills"),
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriberId, {
      lastDrillId: args.drillId,
      lastStoryId: args.storyId,
      lastSentAt: Date.now(),
    });
  },
});

// Used by the on-demand test send: find or create the subscriber so the
// reply has a row to be graded against.
export const ensure = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing !== null) return existing._id;

    return await ctx.db.insert("subscribers", {
      email: args.email,
      active: true,
    });
  },
});

// Removes an address entirely, along with anything it answered. Used when
// someone asks to be taken off, or when the wrong address was added.
export const forget = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (subscriber === null) return { removed: false, attempts: 0 };

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .take(200);

    for (const attempt of attempts) await ctx.db.delete(attempt._id);
    await ctx.db.delete(subscriber._id);

    return { removed: true, attempts: attempts.length };
  },
});
