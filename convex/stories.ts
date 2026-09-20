import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

const MODEL = "gpt-4o-mini";

// Insert a freshly crawled article. Deduped on url via the by_url index so a
// re-crawl of the same source does not create a second copy.
export const saveRawStory = internalMutation({
  args: {
    url: v.string(),
    title: v.string(),
    source: v.string(),
    sourceIcon: v.optional(v.string()),
    image: v.optional(v.string()),
    rawText: v.string(),
    // scam | course | job. Absent means scam, which is what every caller
    // written before the other two verticals passes.
    kind: v.optional(v.string()),
    // Extra fields the crawler already knows and the model should not have to
    // guess at, such as a job's company and apply link. Shape varies by kind.
    seed: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stories")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();

    if (existing !== null) {
      return null;
    }

    const kind = args.kind ?? "scam";

    const storyId = await ctx.db.insert("stories", {
      url: args.url,
      title: args.title,
      source: args.source,
      sourceIcon: args.sourceIcon,
      image: args.image,
      rawText: args.rawText,
      status: "raw",
      kind,
      crawledAt: Date.now(),
    });

    // The mutation already holds the text, so hand it straight to the action.
    // That keeps the action off the database entirely.
    //
    // One crawler, three OpenAI passes. Each kind asks the model for a
    // different shape, so the dispatch happens here rather than inside one
    // prompt trying to be all three.
    if (kind === "course") {
      await ctx.scheduler.runAfter(0, internal.courses.processCourse, {
        storyId,
        title: args.title,
        rawText: args.rawText,
      });
    } else if (kind === "job") {
      await ctx.scheduler.runAfter(0, internal.jobs.processJob, {
        storyId,
        title: args.title,
        rawText: args.rawText,
        seed: args.seed,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.stories.processStory, {
        storyId,
        title: args.title,
        rawText: args.rawText,
      });
    }

    return storyId;
  },
});

const PROCESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "aiRelated",
    "isScam",
    "everydayPerson",
    "unsafeTopic",
    "summary",
    "redFlags",
    "tactic",
  ],
  properties: {
    aiRelated: {
      type: "boolean",
      description:
        "True only when the story itself says AI was used: a deepfake, a cloned voice, an AI-written message, an AI-made image or site, a chatbot. A plain scam with no AI in it is false, however clever it is.",
    },
    isScam: {
      type: "boolean",
      description:
        "True if this is a trick aimed at a person that a reader could learn to recognise. False for accidents, bias, bad decisions by a system, or misuse by an insider.",
    },
    unsafeTopic: {
      type: "string",
      enum: ["none", "sexual", "childAbuse", "selfHarm", "violence"],
      description:
        "Name the topic that makes this unfit for a middle school screen, or none. Crime, police, fraud and stolen money are none.",
    },
    everydayPerson: {
      type: "boolean",
      description:
        "True only if this is a scam a 12 year old or their parent could meet on their own phone. False for anything about hacking tools, phishing kits, tokens, servers, networks or company accounts.",
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
      description:
        "The trick the scam leans on most. Work down the list in TACTIC_GUIDE and take the first that fits.",
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
- Set aiRelated true only when the story says AI was actually used. A deepfake video, a cloned voice, a message or website a model produced, a chatbot. If the story never shows AI doing anything, set it false, no matter how modern or serious the scam is. Ordinary phishing with no AI in it is false.
- unsafeTopic asks you to NAME what is unfit for a middle school screen, not to judge how serious the story is. If you cannot name one of the four, the answer is none.
- Answer none for: fraud of any size, scams, impersonation, fake police or fake FBI agents, stolen money however large, hacked accounts, phishing, fake websites, deepfaked public figures, cloned voices, arrests, court cases, and anything involving crime in general. These are the normal subject matter of this app and they are all fine.
- Answer sexual for sexual content or nude or intimate images of anyone. Answer childAbuse for child sexual abuse material. Answer selfHarm for suicide or self harm. Answer violence for violence, threats of violence, bomb threats, swatting, weapons, terrorism, or a person being killed or badly hurt.
- Set isScam true only if someone is tricked into handing over money, information, access or trust, and a reader could learn to see that trick coming.
- Set it false for a system making a mistake, unfair treatment by software, a staff member misusing access, a company behaving badly, harassment, hoaxes or threats aimed at a school or an organisation, and anything where there is no trick for the reader to spot.
- Set everydayPerson true only if this is a scam a 12 year old or their parent could actually meet, on their own phone, their own email, or their own social media, in their own life.
- Set it false if telling the story needs any of these words: token, credential, kit, tool, exploit, server, network, endpoint, admin, enterprise, infrastructure, or the name of a piece of hacking software. Those stories are written for IT staff, and FlipSec is not for IT staff.
- Set it false when the victim is a company, a government network, a utility, or the people who run them, however serious the story is.
- A useful test: could this land on a 12 year old's phone at the dinner table? If you have to explain what a piece of software is before the story makes sense, the answer is no.

Pick the tactic by working down this list and taking the FIRST one that fits:
1. deepfake - fake video or images of a real person. AI-generated faces, fake officials, fake executives on a video call, fake promotional clips.
2. voice - a cloned or synthetic voice on a phone call or voicemail.
3. injection - an attack aimed at an AI system itself, such as hidden instructions buried in text a model reads.
4. phishing - fake messages, texts, emails or websites built to get information, money or a login code.
5. other - ONLY when none of the four above fit at all.

Two things to get right:
- A scam usually uses several tricks at once. Do not fall back to other because of that. Pick the one it leans on hardest, working down the list in order.
- If aiRelated is true, other is almost always the wrong answer. AI shows up as fake video, a fake voice, or a message a model wrote. One of the first four will fit.`;

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
      // Classification should not change between runs. Dev and prod gave the
      // same story different tactics at the default temperature.
      temperature: 0,
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
      isScam: boolean;
      everydayPerson: boolean;
      unsafeTopic: string;
      summary: string;
      redFlags: string[];
      tactic: string;
    };

    console.log(
      `${args.title} -> ai=${result.aiRelated} scam=${result.isScam} everyday=${result.everydayPerson} unsafe=${result.unsafeTopic}`,
    );

    await ctx.scheduler.runAfter(0, internal.stories.saveProcessed, {
      storyId: args.storyId,
      aiRelated: result.aiRelated,
      isScam: result.isScam,
      everydayPerson: result.everydayPerson,
      classroomSafe: result.unsafeTopic === "none",
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
    isScam: v.boolean(),
    everydayPerson: v.boolean(),
    classroomSafe: v.boolean(),
    summary: v.string(),
    redFlags: v.array(v.string()),
    tactic: v.string(),
  },
  handler: async (ctx, args) => {
    // Both tests must pass. An AI scam aimed at IT staff is still not a post
    // a 12 year old can use.
    // All four gates must pass: AI is really in it, it is a trick a reader
    // could learn to spot, it could happen to an ordinary person, and a
    // teacher could show it to a class.
    if (
      !args.aiRelated ||
      !args.isScam ||
      !args.everydayPerson ||
      !args.classroomSafe
    ) {
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

// The feed. Newest published story first, walked through the by_published
// index so the sync engine reruns this for every client the moment a crawl
// publishes something new.
export const listPublished = query({
  args: { limit: v.optional(v.number()), kind: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Defaults to the scam feed, so a caller that passes nothing — including
    // any client still running the previous bundle — gets exactly what it got
    // before. Every scam row carries kind = "scam" via backfillKind.
    const kind = args.kind ?? "scam";

    const stories = await ctx.db
      .query("stories")
      .withIndex("by_kind_published", (q) =>
        q.eq("kind", kind).eq("status", "published"),
      )
      .order("desc")
      .take(args.limit ?? 30);

    // rawText is never sent to a client. It is cleared on publish, but this
    // strips it explicitly so the rule does not depend on that.
    return stories.map(({ rawText: _rawText, ...story }) => story);
  },
});

// Every story written before the feed had more than one kind has no kind at
// all, and an index lookup on kind = "scam" would not find them. This stamps
// them, and it has to run on a deployment BEFORE listPublished starts reading
// the by_kind_published index, or the scam feed comes back empty.
//
// Safe to run twice: it only touches rows where kind is still missing.
export const backfillKind = internalMutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0;
    let seen = 0;

    for (const status of ["published", "raw", "failed"]) {
      const rows = await ctx.db
        .query("stories")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(500);

      seen += rows.length;
      for (const row of rows) {
        if (row.kind !== undefined) continue;
        await ctx.db.patch(row._id, { kind: "scam" });
        patched++;
      }
    }

    console.log(`backfillKind: stamped ${patched} of ${seen}`);
    return { seen, patched };
  },
});

// Queues drill regeneration for published stories whose drill predates the
// lesson steps. saveDrill patches the existing row rather than duplicating it.
export const backfillLessons = internalMutation({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query("stories")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(50);

    let queued = 0;
    for (const story of published) {
      const drill = await ctx.db
        .query("drills")
        .withIndex("by_story", (q) => q.eq("storyId", story._id))
        .unique();

      if (
        drill !== null &&
        drill.steps !== undefined &&
        drill.whyItWorks !== undefined &&
        drill.illusion !== undefined
      ) {
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.drills.makeDrill, {
        storyId: story._id,
        summary: story.summary ?? "",
        tactic: story.tactic ?? "other",
      });
      queued++;
    }

    return { published: published.length, queued };
  },
});

// Stories crawled before og:image was captured keep their text but have no
// picture. This hands the action the list so it can go fetch them.
export const listMissingImages = internalQuery({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query("stories")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(50);

    return published
      .filter((s) => s.image === undefined)
      .map((s) => ({ storyId: s._id, url: s.url }));
  },
});

export const setImage = internalMutation({
  args: { storyId: v.id("stories"), image: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.storyId, { image: args.image });
  },
});

export const listForReclassify = internalQuery({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query("stories")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(50);

    return published.map((s) => ({
      storyId: s._id,
      title: s.title,
      summary: s.summary ?? "",
      tactic: s.tactic ?? "other",
    }));
  },
});

export const setTactic = internalMutation({
  args: { storyId: v.id("stories"), tactic: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.storyId, { tactic: args.tactic });
  },
});

const TACTIC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tactic"],
  properties: {
    tactic: {
      type: "string",
      enum: ["phishing", "deepfake", "voice", "injection", "other"],
    },
  },
} as const;

// rawText is gone by the time a story is published, so this reclassifies from
// the summary. That is enough: the summary already names the trick.
export const reclassifyTactics = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; changed: number }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set in Convex env vars");

    const openai = new OpenAI({ apiKey });
    const stories: Array<{
      storyId: Id<"stories">;
      title: string;
      summary: string;
      tactic: string;
    }> = await ctx.runQuery(internal.stories.listForReclassify, {});

    let changed = 0;
    for (const story of stories) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: PROCESS_PROMPT },
          {
            role: "user",
            content: `Classify the tactic only.\n\nHeadline: ${story.title}\n\nPost: ${story.summary}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "tactic", strict: true, schema: TACTIC_SCHEMA },
        },
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) continue;

      const { tactic } = JSON.parse(raw) as { tactic: string };
      if (tactic === story.tactic) continue;

      console.log(`${story.title.slice(0, 45)}: ${story.tactic} -> ${tactic}`);
      await ctx.runMutation(internal.stories.setTactic, {
        storyId: story.storyId,
        tactic,
      });
      changed++;
    }

    return { checked: stories.length, changed };
  },
});

// Failed stories keep their URL, which blocks a re-crawl from ever looking at
// them again. Clearing them lets a changed filter re-judge the same sources.
// kind narrows it to one feed. Retuning the course gates should not throw
// away every rejected scam story and make the next crawl pay to re-judge
// them all.
export const clearFailed = internalMutation({
  args: { limit: v.optional(v.number()), kind: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const failed = await ctx.db
      .query("stories")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(args.limit ?? 200);

    const target =
      args.kind === undefined
        ? failed
        : failed.filter((story) => (story.kind ?? "scam") === args.kind);

    for (const story of target) await ctx.db.delete(story._id);
    return { deleted: target.length };
  },
});

export const unpublish = internalMutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const drill = await ctx.db
      .query("drills")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .unique();

    if (drill !== null) await ctx.db.delete(drill._id);
    await ctx.db.delete(args.storyId);
  },
});

const GATES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["aiRelated", "isScam", "everydayPerson", "unsafeTopic"],
  properties: {
    aiRelated: { type: "boolean" },
    isScam: { type: "boolean" },
    everydayPerson: { type: "boolean" },
    unsafeTopic: {
      type: "string",
      enum: ["none", "sexual", "childAbuse", "selfHarm", "violence"],
    },
  },
} as const;

// Re-judges everything already published against the current gates, for when
// the gates change. Works from the summary, since rawText is gone by publish.
export const recheckGates = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; removed: number }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set in Convex env vars");

    const openai = new OpenAI({ apiKey });
    const stories: Array<{
      storyId: Id<"stories">;
      title: string;
      summary: string;
    }> = await ctx.runQuery(internal.stories.listForReclassify, {});

    let removed = 0;
    for (const story of stories) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: PROCESS_PROMPT },
          {
            role: "user",
            content: `Answer the everydayPerson question only.\n\nHeadline: ${story.title}\n\nPost: ${story.summary}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "gates", strict: true, schema: GATES_SCHEMA },
        },
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) continue;

      const judged = JSON.parse(raw) as {
        aiRelated: boolean;
        isScam: boolean;
        everydayPerson: boolean;
        unsafeTopic: string;
      };

      const gates = {
        aiRelated: judged.aiRelated,
        isScam: judged.isScam,
        everydayPerson: judged.everydayPerson,
        [`unsafe:${judged.unsafeTopic}`]: judged.unsafeTopic === "none",
      };

      const failed = Object.entries(gates)
        .filter(([, passed]) => !passed)
        .map(([gate]) => gate);
      if (failed.length === 0) continue;

      console.log(`removing (${failed.join(", ")}): ${story.title.slice(0, 60)}`);
      await ctx.runMutation(internal.stories.unpublish, {
        storyId: story.storyId,
      });
      removed++;
    }

    return { checked: stories.length, removed };
  },
});
