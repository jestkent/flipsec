import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

// Public: a reader gives their address on the site. Deduped on by_email so
// signing up twice reactivates rather than creating a second row.
const FEEDS = ["scam", "course", "job"];

// Whatever the browser sent, reduced to known feeds. A caller can put any
// string in a public mutation's array, and an unknown kind would sit in the
// row forever producing an empty section in every email.
function cleanKinds(kinds: string[] | undefined): string[] {
  if (!kinds || kinds.length === 0) return ["scam"];
  const kept = FEEDS.filter((feed) => kinds.includes(feed));
  return kept.length > 0 ? kept : ["scam"];
}

// A "contains an @" test let "a@b" through, and a junk address that bounces
// costs sending reputation on a shared domain the daily mail depends on.
// Deliberately not the full RFC grammar: one @, a dot in the domain, no
// spaces, no consecutive dots, and a plausible TLD.
const EMAIL = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,24}$/i;

function cleanEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (email.length > 200 || !EMAIL.test(email) || email.includes("..")) {
    throw new Error("that does not look like an email address");
  }
  return email;
}

export const subscribe = mutation({
  args: {
    email: v.string(),
    userId: v.optional(v.string()),
    // Which feeds to send. Signing up from a tab asks for that tab.
    kinds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const email = cleanEmail(args.email);

    const kinds = cleanKinds(args.kinds);

    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing !== null) {
      // Signing up again from a different tab adds that feed rather than
      // replacing what they already asked for.
      const merged = cleanKinds([...(existing.kinds ?? ["scam"]), ...kinds]);
      await ctx.db.patch(existing._id, { active: true, kinds: merged });
      return { already: true };
    }

    await ctx.db.insert("subscribers", {
      email,
      userId: args.userId,
      active: true,
      kinds,
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

    return subs.map((s) => ({
      subscriberId: s._id,
      email: s.email,
      kinds: s.kinds ?? ["scam"],
      // So the send can avoid repeating what this reader already got.
      lastDrillId: s.lastDrillId ?? null,
    }));
  },
});

// The newest published card in a feed that is not the scam feed, for the
// daily email. Courses and jobs carry their whole back on the row, so there
// is no second table to join.
export const pickTodaysCard = internalQuery({
  args: { kind: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("stories")
      .withIndex("by_kind_published", (q) =>
        q.eq("kind", args.kind).eq("status", "published"),
      )
      .order("desc")
      .take(1);

    const row = rows[0];
    if (row === undefined) return null;

    const back = (row.back ?? {}) as {
      company?: string;
      locationChip?: string;
      firstStep?: string;
      timeCommitment?: string;
    };

    return {
      title: row.title,
      summary: row.summary ?? "",
      url: row.url,
      source: row.source,
      company: back.company,
      locationChip: back.locationChip,
      firstStep: back.firstStep,
      timeCommitment: back.timeCommitment,
    };
  },
});

// Turns a reader off without deleting what they answered. Called by the
// unsubscribe link, which has already checked the signature.
export const deactivate = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (subscriber === null) return { removed: false };
    await ctx.db.patch(subscriber._id, { active: false });
    return { removed: true };
  },
});

// Several candidates rather than one, so the daily send can skip whatever a
// given reader got last time. pickTodaysDrill returned only the newest story
// with a drill and nothing consulted lastDrillId, so every subscriber got the
// same drill every morning until a crawl published something newer.
export const listDrillCandidates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_kind_published", (q) =>
        q.eq("kind", "scam").eq("status", "published"),
      )
      .order("desc")
      .take(15);

    const candidates = [];
    for (const story of stories) {
      const drill = await ctx.db
        .query("drills")
        .withIndex("by_story", (q) => q.eq("storyId", story._id))
        .unique();

      if (drill === null) continue;
      candidates.push({
        drillId: drill._id,
        storyId: story._id,
        prompt: drill.prompt,
        choices: drill.choices,
        source: story.source,
        url: story.url,
      });
    }

    return candidates;
  },
});

// The newest published story that has a drill. Used by the on-demand test
// send, where "today's" is exactly what is wanted.
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
