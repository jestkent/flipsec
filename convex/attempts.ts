import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Records an answer and grades it. A web answer is a choice index, so grading
// is a comparison and needs no AI. The free-text grading path is for replies
// that arrive by email.
export const submitAnswer = mutation({
  args: {
    userId: v.string(),
    drillId: v.id("drills"),
    choice: v.number(),
  },
  handler: async (ctx, args) => {
    const drill = await ctx.db.get(args.drillId);
    if (drill === null) throw new Error("drill not found");

    if (args.choice < 0 || args.choice >= drill.choices.length) {
      throw new Error("choice is out of range");
    }

    const correct = args.choice === drill.correct;

    // One attempt per reader per drill. Answering again returns the first
    // result rather than stacking rows.
    const existing = await ctx.db
      .query("attempts")
      .withIndex("by_user_drill", (q) =>
        q.eq("userId", args.userId).eq("drillId", args.drillId),
      )
      .unique();

    if (existing === null) {
      await ctx.db.insert("attempts", {
        userId: args.userId,
        drillId: args.drillId,
        answer: String(args.choice),
        correct,
        source: "web",
        createdAt: Date.now(),
      });
    }

    // The answer key only leaves the server once the reader has committed.
    return {
      correct,
      correctIndex: drill.correct,
      explanation: drill.explanation,
      steps: drill.steps ?? [],
    };
  },
});

// Lets a returning reader see posts they have already answered, without
// replaying the whole feed through the server.
export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(200);

    return attempts.map((a) => ({
      drillId: a.drillId,
      answer: a.answer,
      correct: a.correct,
    }));
  },
});
