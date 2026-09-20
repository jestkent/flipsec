import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const MODEL = "gpt-4o-mini";

// Insert a freshly crawled article. Deduped on url via the by_url index so a
// re-crawl of the same source does not create a second copy.
export const saveRawStory = internalMutation({
  args: {
    url: v.string(),
    title: v.string(),
    source: v.string(),
    sourceIcon: v.optional(v.string()),
    rawText: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stories")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();

    if (existing !== null) {
      return null;
    }

    const storyId = await ctx.db.insert("stories", {
      url: args.url,
      title: args.title,
      source: args.source,
      sourceIcon: args.sourceIcon,
      rawText: args.rawText,
      status: "raw",
      crawledAt: Date.now(),
    });

    // The mutation already holds the text, so hand it straight to the action.
    // That keeps the action off the database entirely.
    await ctx.scheduler.runAfter(0, internal.stories.processStory, {
      storyId,
      title: args.title,
      rawText: args.rawText,
    });

    return storyId;
  },
});

const PROCESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["aiRelated", "summary", "redFlags", "tactic"],
  properties: {
    aiRelated: {
      type: "boolean",
      description:
        "True only if artificial intelligence makes this scam possible, cheaper, or more convincing. Deepfakes, cloned voices, AI-written messages, AI-generated images, video or websites all count.",
    },
    summary: {
      type: "string",
      description: "A summary of the scam in 60 words or fewer.",
    },
    redFlags: {
      type: "array",
      items: { type: "string" },
      description: "Two to four warning signs, each at most four words.",
    },
    tactic: {
      type: "string",
      enum: ["phishing", "deepfake", "voice", "injection", "other"],
    },
  },
} as const;

const PROCESS_PROMPT = `You write short posts for FlipSec, a security awareness feed.

Your readers are ordinary people. Many are middle school students, their parents, and their teachers. Nobody has a security background.

Rules you must follow:
- Write everything in your own words. Do not reuse any phrase from the source text. This is a copyright requirement, not a style note.
- The summary is 60 words maximum.
- Write at a 7th grade reading level. Short sentences. Plain verbs. Sentence case.
- If a 7th grader would not use a word, do not use it. Never write "revictimize", "personally identifiable information", "threat actor", "malicious", "mitigation" or "credentials".
- Say what happened and how the trick works. Do not give advice or tell the reader what to do.
- Red flags are the signs that give the scam away, not instructions. Two to four of them, four words maximum each, lowercase.
- Set aiRelated true only when AI is genuinely part of the scam. A plain scam with no AI in it gets false, even if it is a serious scam.
- Pick the tactic that fits best: deepfake for fake video or images, voice for cloned voices, phishing for fake messages or websites, injection for attacks on AI systems themselves, other for anything else.`;

export const processStory = internalAction({
  args: {
    storyId: v.id("stories"),
    title: v.string(),
    rawText: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set in Convex env vars");

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: PROCESS_PROMPT },
        {
          role: "user",
          content: `Headline: ${args.title}\n\nSource text:\n${args.rawText.slice(0, 12000)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "story", strict: true, schema: PROCESS_SCHEMA },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error(`OpenAI returned no content for ${args.storyId}`);

    const result = JSON.parse(raw) as {
      aiRelated: boolean;
      summary: string;
      redFlags: string[];
      tactic: string;
    };

    console.log(
      `${args.title} -> aiRelated=${result.aiRelated} tactic=${result.tactic}`,
    );

    await ctx.scheduler.runAfter(0, internal.stories.saveProcessed, {
      storyId: args.storyId,
      aiRelated: result.aiRelated,
      summary: result.summary,
      redFlags: result.redFlags,
      tactic: result.tactic,
    });
  },
});

// Publishes the story and drops rawText. Stories that are not about AI are
// marked failed so they never reach the feed, and their text is dropped too.
export const saveProcessed = internalMutation({
  args: {
    storyId: v.id("stories"),
    aiRelated: v.boolean(),
    summary: v.string(),
    redFlags: v.array(v.string()),
    tactic: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.aiRelated) {
      await ctx.db.patch(args.storyId, { status: "failed", rawText: undefined });
      return;
    }

    await ctx.db.patch(args.storyId, {
      summary: args.summary,
      redFlags: args.redFlags,
      tactic: args.tactic,
      status: "published",
      publishedAt: Date.now(),
      rawText: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.drills.makeDrill, {
      storyId: args.storyId,
      summary: args.summary,
      tactic: args.tactic,
    });
  },
});

// Retry path for stories that were crawled but never processed, for example
// after a failed OpenAI call. Walks the by_status index, never the table.
export const reprocessRaw = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const stuck = await ctx.db
      .query("stories")
      .withIndex("by_status", (q) => q.eq("status", "raw"))
      .take(args.limit ?? 20);

    let queued = 0;
    for (const story of stuck) {
      if (!story.rawText) continue;
      await ctx.scheduler.runAfter(0, internal.stories.processStory, {
        storyId: story._id,
        title: story.title,
        rawText: story.rawText,
      });
      queued++;
    }

    return { found: stuck.length, queued };
  },
});
