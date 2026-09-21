import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { reserveSlot } from "./rateLimit";

// Public: a reader gives their address on the site. Deduped on by_email so
// signing up twice reactivates rather than creating a second row.
const FEEDS = ["scam", "course", "job"];

// What the reader calls each feed. The database keeps the original kind
// values; these are only for saying out loud what someone signed up for.
const FEED_NAMES: Record<string, string> = {
  scam: "AI Sec News",
  course: "AI Sec Learn",
  job: "AI Sec Jobs",
};

export function feedNames(kinds: string[]): string {
  const named = FEEDS.filter((f) => kinds.includes(f)).map((f) => FEED_NAMES[f]);
  if (named.length <= 1) return named[0] ?? FEED_NAMES.scam;
  return `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
}

// One address is one subscription, so one confirmation. Signing up from the
// news tab and then the jobs tab merges both into the same row, and the token
// is an HMAC of the address alone, so the message already in the inbox
// confirms whatever set of feeds the reader ends up asking for. Sending a
// second copy would be three identical emails for one decision, which is mail
// amplification of exactly the kind double opt-in exists to prevent.
//
// Long enough to cover somebody working through the tabs, short enough that a
// reader who genuinely lost the message can ask again.
const RESEND_AFTER_MS = 15 * 60 * 1000;

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

// Anyone can type any address into this box, including an address that is not
// theirs. Before double opt-in, doing so put a stranger on a daily mailing
// list they never asked to join: harassment for them, spam complaints against
// a shared sending domain for us, and no provable consent under GDPR.
//
// So a sign-up no longer subscribes anyone. It records an UNCONFIRMED row and
// mails that address a link. Only following the link from the address itself
// turns the mail on, which means consent comes from the mailbox rather than
// from whoever filled in the form.
//
// It is also rate limited, tightly. It is the only public write that both
// costs an outbound email and names a third party.
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

    const allowed = await reserveSlot(
      ctx,
      "subscribe",
      args.userId ?? "anonymous",
      "subscribe",
    );
    if (!allowed) throw new Error("Too many sign-ups from here. Try again later.");

    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing !== null) {
      // Signing up again from a different tab adds that feed rather than
      // replacing what they already asked for.
      const merged = cleanKinds([...(existing.kinds ?? ["scam"]), ...kinds]);

      // Absent pending means this row predates double opt-in, or was already
      // confirmed. Either way it is a real reader and nothing needs resending.
      const stillPending = existing.pending === true;
      const lastSent = existing.confirmSentAt ?? 0;
      const resend = stillPending && Date.now() - lastSent > RESEND_AFTER_MS;

      await ctx.db.patch(existing._id, {
        active: true,
        kinds: merged,
        // Stamped in the same transaction that decides to send, so two tabs
        // racing cannot both win the check and both mail.
        ...(resend ? { confirmSentAt: Date.now() } : {}),
      });

      if (resend) {
        await ctx.scheduler.runAfter(0, internal.email.sendConfirmation, {
          email,
          kinds: merged,
        });
      }
      // Still pending means a confirmation is sitting in their inbox, whether
      // this call sent it or an earlier one did. Telling them to go and look
      // is right either way.
      return { already: true, confirm: stillPending };
    }

    await ctx.db.insert("subscribers", {
      email,
      userId: args.userId,
      // active stays true so unsubscribe still means what it says; pending is
      // what holds the mail back until the address itself says yes.
      active: true,
      pending: true,
      kinds,
      confirmSentAt: Date.now(),
    });

    // A mutation reaches the network only by scheduling. Scheduling is itself
    // a database write, so a mutation that throws sends nothing.
    await ctx.scheduler.runAfter(0, internal.email.sendConfirmation, { email, kinds });
    return { already: false, confirm: true };
  },
});

// What this address asked for, so the confirm page can tick the boxes it
// already wants rather than making the reader start from nothing.
export const pendingFor = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.null(), v.object({ kinds: v.array(v.string()), pending: v.boolean() })),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
    if (row === null) return null;
    return { kinds: cleanKinds(row.kinds), pending: row.pending === true };
  },
});

// Following the link from the address itself. Idempotent: confirming twice is
// the same as confirming once, which matters because people forward mail and
// click things more than once.
export const confirm = internalMutation({
  args: { email: v.string(), kinds: v.optional(v.array(v.string())) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
    if (row === null) return false;
    await ctx.db.patch(row._id, {
      pending: false,
      active: true,
      confirmedAt: row.confirmedAt ?? Date.now(),
      // What the reader ticked on the confirm page REPLACES what the sign-up
      // box guessed from whichever tab they happened to be on. Signing up
      // from three tabs is not the same as wanting three feeds, and the
      // moment of consent is the right place to say which.
      ...(args.kinds ? { kinds: cleanKinds(args.kinds) } : {}),
    });
    return true;
  },
});

export const listActive = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subs = (await ctx.db
      .query("subscribers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(200))
      // An unconfirmed address never receives the daily mail. Absent pending
      // is a row from before double opt-in and is treated as confirmed.
      .filter((s) => s.pending !== true);

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
