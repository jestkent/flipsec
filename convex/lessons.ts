import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";

const MODEL = "gpt-4o-mini";

export const getCached = internalQuery({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const lesson = await ctx.db
      .query("lessons")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();

    return lesson === null ? null : lesson.body;
  },
});

export const getContext = internalQuery({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (story === null || story.status !== "published") return null;

    const drill = await ctx.db
      .query("drills")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();

    return {
      title: story.title,
      summary: story.summary ?? "",
      tactic: story.tactic ?? "other",
      steps: drill?.steps ?? [],
    };
  },
});

export const save = internalMutation({
  args: { storyId: v.id("stories"), body: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();

    if (existing !== null) return;

    await ctx.db.insert("lessons", {
      storyId: args.storyId,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});

const TEACH_PROMPT = `You are a patient tutor sitting next to one student, walking them through how a scam works.

Your student is about 12 years old. Smart, curious, no security background.

Write a short lesson, four or five short paragraphs. No headings, no bullet points, no numbered lists. Just paragraphs, the way a person talks.

How to teach it:
- Start with the idea behind the trick, not the details. What is the scammer really doing to this person?
- Use one everyday comparison to make it click. Something from school, a game, or a family. One comparison only, do not pile them up.
- Walk through the scam in order, and at each turn say what the person on the other end is thinking and feeling. That is the part that makes it stick.
- Name the one thing that would have given it away, and say why it is hard to notice in the moment.
- End with the idea in one sentence, so they could explain it to someone else.

How to write it:
- 7th grade reading level. Short sentences. Plain verbs. Sentence case.
- Talk to the student as "you". Warm, never talking down, never scolding.
- No jargon. If a 12 year old would not say the word, do not use it.
- Never say "it is important to" or "always remember". Just teach.
- 280 words maximum.`;

export const teachLesson = action({
  args: { storyId: v.id("stories"), userId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ body: string }> => {
    // Generated once per story and kept. PLAN.md section 14: never regenerate
    // per view.
    const cached: string | null = await ctx.runQuery(
      internal.lessons.getCached,
      { storyId: args.storyId },
    );
    if (cached !== null) return { body: cached };

    const story = await ctx.runQuery(internal.lessons.getContext, {
      storyId: args.storyId,
    });
    if (story === null) return { body: "That post is not available." };

    // Only a cache miss reaches the model, so this is bounded by the number
    // of published stories — but it was previously bounded by nothing else,
    // and a caller could still walk every uncached story at once. It shares
    // the ask box's hourly bucket, and claims the slot in the same
    // transaction that counts it.
    const { questionId } = await ctx.runMutation(internal.questions.reserve, {
      userId: args.userId ?? "anonymous",
      storyId: args.storyId,
      question: "[lesson]",
    });
    if (questionId === null) {
      return {
        body: "You have opened a lot of lessons this hour. Try again later.",
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set in Convex env vars");

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 700,
      messages: [
        { role: "system", content: TEACH_PROMPT },
        {
          role: "user",
          content: `The scam: ${story.title}\n\nWhat happened:\n${story.summary}\n\nHow it runs:\n${story.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nThe tactic: ${story.tactic}`,
        },
      ],
    });

    const body =
      completion.choices[0]?.message?.content?.trim() ??
      "I could not put that lesson together. Try again in a moment.";

    await ctx.runMutation(internal.lessons.save, {
      storyId: args.storyId,
      body,
    });
    await ctx.runMutation(internal.questions.record, {
      questionId,
      answer: "[lesson generated]",
    });

    return { body };
  },
});
