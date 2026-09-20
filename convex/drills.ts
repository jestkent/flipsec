import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";

const MODEL = "gpt-4o-mini";

const DRILL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prompt", "choices", "correct", "explanation"],
  properties: {
    prompt: {
      type: "string",
      description:
        "A short scene the reader could really be in, then one question about it.",
    },
    choices: {
      type: "array",
      items: { type: "string" },
      description: "Exactly three answers, one right and two believable.",
    },
    correct: {
      type: "integer",
      description: "The index of the right answer, 0, 1 or 2.",
    },
    explanation: {
      type: "string",
      description: "Why that answer is right, 40 words maximum.",
    },
  },
} as const;

const DRILL_PROMPT = `You write practice questions for FlipSec, a security awareness feed.

The reader just read a short post about a real scam. Now give them one question that puts them inside that same scam.

Rules you must follow:
- Open with a short scene: a text, an email, a call, a video. Two or three sentences. Make it feel like something that would land on a real phone.
- Then ask one question about that scene. "What is the strongest red flag here?" works well.
- Give exactly three answers. One is right. The other two must be tempting, not silly. A reader who skimmed should be able to pick wrong.
- The right answer is about why the message cannot be trusted, not about what the reader should go do.
- Write at a 7th grade reading level. Short sentences. Plain verbs. Sentence case.
- Do not name the source, the agency, or the news story. The reader is in the scene, not reading about it.
- The explanation is 40 words maximum and says what gave the scam away.`;

export const makeDrill = internalAction({
  args: {
    storyId: v.id("stories"),
    summary: v.string(),
    tactic: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set in Convex env vars");

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: DRILL_PROMPT },
        {
          role: "user",
          content: `The post the reader just saw:\n${args.summary}\n\nThe tactic: ${args.tactic}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "drill", strict: true, schema: DRILL_SCHEMA },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error(`OpenAI returned no drill for ${args.storyId}`);

    const drill = JSON.parse(raw) as {
      prompt: string;
      choices: string[];
      correct: number;
      explanation: string;
    };

    if (drill.choices.length !== 3) {
      throw new Error(`expected 3 choices, got ${drill.choices.length}`);
    }
    if (drill.correct < 0 || drill.correct >= drill.choices.length) {
      throw new Error(`correct index ${drill.correct} is out of range`);
    }

    console.log(`drill for ${args.storyId}: ${drill.prompt.slice(0, 60)}...`);

    await ctx.scheduler.runAfter(0, internal.drills.saveDrill, {
      storyId: args.storyId,
      prompt: drill.prompt,
      choices: drill.choices,
      correct: drill.correct,
      explanation: drill.explanation,
    });
  },
});

// One drill per story. Deduped on the by_story index so a re-run does not
// stack a second drill behind the same post.
export const saveDrill = internalMutation({
  args: {
    storyId: v.id("stories"),
    prompt: v.string(),
    choices: v.array(v.string()),
    correct: v.number(),
    explanation: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("drills")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();

    if (existing !== null) {
      return existing._id;
    }

    return await ctx.db.insert("drills", {
      storyId: args.storyId,
      prompt: args.prompt,
      choices: args.choices,
      correct: args.correct,
      explanation: args.explanation,
    });
  },
});

// The back of a post. Looked up through the by_story index.
// correct and explanation stay on the server until the reader answers.
export const drillForStory = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const drill = await ctx.db
      .query("drills")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();

    if (drill === null) return null;

    return {
      _id: drill._id,
      storyId: drill.storyId,
      prompt: drill.prompt,
      choices: drill.choices,
    };
  },
});
