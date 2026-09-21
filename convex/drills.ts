import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";

const MODEL = "gpt-4o-mini";

const DRILL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "prompt",
    "choices",
    "correct",
    "explanation",
    "steps",
    "whyItWorks",
    "illusion",
  ],
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
    steps: {
      type: "array",
      items: { type: "string" },
      description:
        "Exactly three steps showing how the scam runs, in order, one sentence each.",
    },
    whyItWorks: {
      type: "string",
      description:
        "Why a careful person still falls for this, 45 words maximum.",
    },
    illusion: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["seen", "real"],
        properties: {
          seen: { type: "string" },
          real: { type: "string" },
        },
      },
      description:
        "Exactly three pairs: what the person thought was happening, and what was actually happening.",
    },
  },
} as const;

const DRILL_PROMPT = `You write practice questions for FlipSec.ai, a security awareness feed.

The reader just read a short post about a real scam. Now give them one question that puts them inside that same scam.

Rules you must follow:
- Open with a short scene: a text, an email, a call, a video. Two or three sentences. Make it feel like something that would land on a real phone.
- Then ask one question about that scene. "What is the strongest red flag here?" works well.
- Give exactly three answers. One is right. The other two must be tempting, not silly. A reader who skimmed should be able to pick wrong.
- The right answer is about why the message cannot be trusted, not about what the reader should go do.
- Write at a 7th grade reading level. Short sentences. Plain verbs. Sentence case.
- Do not name the source, the agency, or the news story. The reader is in the scene, not reading about it.
- The explanation is 40 words maximum and says what gave the scam away.
- Then write exactly three steps showing how the scam runs from start to finish, in order. One short sentence each. Step one is what the scammer does first, step three is what they walk away with. Same reading level. These are the first thing the reader sees when they flip the post, so they teach the mechanic plainly.
- Then write exactly three illusion pairs. seen is what the person believed was happening, in the words they would have used at the time. real is what was actually happening. Eight words maximum each, no full stops. Make the two halves line up so the contrast is obvious: if seen is "a lawyer who knows my case", real is "a stranger using a face-swap app". Each pair must be about a different part of the scam: one about who the person thought they were dealing with, one about what they thought they were looking at, and one about what they thought would happen next. Never make the same contrast twice. Do not repeat the steps.
- Then write whyItWorks: why a careful person still falls for this one. Name the feeling the scam uses, such as fear, hurry, or wanting to help. 45 words maximum, same reading level. Do not give advice and do not repeat the steps.`;

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
      steps: string[];
      whyItWorks: string;
      illusion: Array<{ seen: string; real: string }>;
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
      steps: drill.steps,
      whyItWorks: drill.whyItWorks,
      illusion: drill.illusion,
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
    steps: v.optional(v.array(v.string())),
    whyItWorks: v.optional(v.string()),
    illusion: v.optional(
      v.array(v.object({ seen: v.string(), real: v.string() })),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("drills")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();

    if (existing !== null) {
      // A drill written before the lesson existed gets its steps filled in
      // rather than a second drill stacked behind the same post.
      if (
        existing.steps === undefined ||
        existing.whyItWorks === undefined ||
        existing.illusion === undefined
      ) {
        await ctx.db.patch(existing._id, {
          steps: args.steps ?? existing.steps,
          whyItWorks: args.whyItWorks ?? existing.whyItWorks,
          illusion: args.illusion ?? existing.illusion,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("drills", {
      storyId: args.storyId,
      prompt: args.prompt,
      choices: args.choices,
      correct: args.correct,
      explanation: args.explanation,
      steps: args.steps,
      whyItWorks: args.whyItWorks,
      illusion: args.illusion,
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
      steps: drill.steps ?? [],
      whyItWorks: drill.whyItWorks ?? "",
      illusion: drill.illusion ?? [],
    };
  },
});

// Clears the generated lesson fields so backfillLessons rewrites them. Used
// when a prompt changes and the existing lessons need to catch up.
export const resetLessonFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const drills = await ctx.db.query("drills").take(200);

    for (const drill of drills) {
      await ctx.db.patch(drill._id, {
        steps: undefined,
        whyItWorks: undefined,
        illusion: undefined,
      });
    }

    return { reset: drills.length };
  },
});
