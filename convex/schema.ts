import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { language, speechLanguage } from "./languages";

export default defineSchema({
  browserSessions: defineTable({ tokenHash: v.string(), expiresAt: v.number() })
    .index("by_tokenHash", ["tokenHash"]),
  stories: defineTable({
    url: v.string(),
    title: v.string(),
    source: v.string(),
    sourceIcon: v.optional(v.string()),
    image: v.optional(v.string()),    // og:image from the source, when it has one
    rawText: v.optional(v.string()),  // cleared after processing
    summary: v.optional(v.string()),
    redFlags: v.optional(v.array(v.string())),
    tactic: v.optional(v.string()),   // phishing | deepfake | voice | injection | other
    status: v.string(),               // raw | published | failed
    publishedAt: v.optional(v.number()),
    crawledAt: v.number(),
    jobCheckedAt: v.optional(v.number()),
    // Which feed this card belongs to: scam | course | job. Optional because
    // the scam stories predate it; backfillKind fills them in and everything
    // written since sets it. Absent is read as "scam".
    kind: v.optional(v.string()),
    // The generated flip side, shaped per kind. Deliberately v.any(): a course
    // back and a job back hold different fields, and pinning either down now
    // would mean a schema change every time one of them moves. The scam kind
    // does not use it — its back is the drills row, which is already typed.
    back: v.optional(v.any()),
  })
    .index("by_status", ["status"])
    .index("by_url", ["url"])
    .index("by_kind_source", ["kind", "source"])
    .index("by_published", ["status", "publishedAt"])
    .index("by_kind_published", ["kind", "status", "publishedAt"]),

  drills: defineTable({
    storyId: v.id("stories"),
    prompt: v.string(),
    choices: v.array(v.string()),
    correct: v.number(),
    explanation: v.string(),
    steps: v.optional(v.array(v.string())),   // the three stages, shown on flip
    whyItWorks: v.optional(v.string()),       // why people fall for it
    // What the victim believed, beside what was actually happening. Drawn as
    // the "why it works" panel.
    illusion: v.optional(
      v.array(v.object({ seen: v.string(), real: v.string() })),
    ),
  }).index("by_story", ["storyId"]),

  attempts: defineTable({
    userId: v.string(),
    drillId: v.id("drills"),
    answer: v.string(),
    correct: v.optional(v.boolean()),
    feedback: v.optional(v.string()),
    source: v.string(),               // web | email
    createdAt: v.number(),
    deliveryStatus: v.optional(v.union(v.literal("pending"), v.literal("sending"), v.literal("sent"), v.literal("failed"))),
    deliveryAttempts: v.optional(v.number()),
    deliveryStartedAt: v.optional(v.number()),
    deliveryLeaseUntil: v.optional(v.number()),
    deliveryMessageId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_drill", ["userId", "drillId"]),

  // A longer tutor-style lesson, generated on demand and kept. PLAN.md
  // section 14 says process a story once, never regenerate per view.
  lessons: defineTable({
    storyId: v.id("stories"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_story", ["storyId"]),

  // Reader questions about a post, answered by OpenAI with that post as the
  // only context. Stored so the hourly rate limit has something to count.
  questions: defineTable({
    userId: v.string(),
    storyId: v.id("stories"),
    question: v.string(),
    answer: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_time", ["userId", "createdAt"])
    // userId comes from the browser and can be regenerated at will, so the
    // per-reader cap is a courtesy. This index backs a deployment-wide cap
    // that a caller cannot get around.
    .index("by_time", ["createdAt"]),

  // Only usage metadata is stored. Message text and images sent to the
  // checker never enter the database.
  toolChecks: defineTable({
    userId: v.string(),
    kind: v.union(
      v.literal("message"),
      v.literal("image"),
      v.literal("chat"),
      v.literal("speech"),
      v.literal("translate"),
      v.literal("subscribe"),
      v.literal("answer"),
      // Questions asked BY EMAIL. Its own kind so it gets its own budget:
      // an address that answers anything with a model is money spent by
      // whoever writes to it, and it must not be able to drain Ask FlipSec
      // on the website, or be drained by it.
      v.literal("emailAsk"),
      v.literal("session"),
    ),
    createdAt: v.number(),
  })
    .index("by_user_time", ["userId", "createdAt"])
    .index("by_time", ["createdAt"])
    // Added so an hourly budget counts only the kinds that belong to it. The
    // two indexes above are kept: they still back "everything this reader did"
    // reads, and dropping an index is not an additive change.
    .index("by_kind_time", ["kind", "createdAt"])
    .index("by_user_kind_time", ["userId", "kind", "createdAt"]),

  // Maps a server-derived anonymous session owner to its Agent component thread.
  // The component owns the messages; this table is the access boundary used
  // by our public query and action.
  assistantThreads: defineTable({
    userId: v.string(),
    threadId: v.string(),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_user_time", ["userId", "createdAt"]),

  storyTranslations: defineTable({
    storyId: v.id("stories"),
    language,
    content: v.any(),
    sourceHash: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_story_language", ["storyId", "language"]),

  speechAudio: defineTable({
    contentHash: v.string(),
    language: speechLanguage,
    storageId: v.id("_storage"),
    createdAt: v.number(),
  }).index("by_hash_language", ["contentHash", "language"]),

  subscribers: defineTable({
    email: v.string(),
    userId: v.optional(v.string()),
    active: v.boolean(),
    // Double opt-in. ABSENT means confirmed: every row written before this
    // existed is a real reader who asked for the mail under the old flow, and
    // reading absent as "pending" would have silently unsubscribed all of
    // them. Only a new sign-up sets it to true, and confirming clears it.
    pending: v.optional(v.boolean()),
    // The Agent thread behind this reader's email conversation, so a follow-up
    // question keeps the context of the last one.
    //
    // Deliberately kept HERE and never in `assistantThreads`. That table is
    // what `assistantMessages.list`, a PUBLIC query, checks ownership against.
    // Registering an email thread there would put a conversation behind a
    // caller-supplied identifier that happens to be somebody's address, which
    // is the shape that got `attempts.listForUser` deleted. Absent from that
    // table, the public query returns [] for these threads and cannot be
    // talked into anything else.
    assistantThreadId: v.optional(v.string()),
    confirmedAt: v.optional(v.number()),
    // When the confirmation was last sent, so signing up from a second tab
    // does not mail a second copy of a message already sitting in the inbox.
    confirmSentAt: v.optional(v.number()),
    // When the first card was sent, the moment they confirmed. Its only job
    // is to make that send happen ONCE. The confirm link lives in a mailbox
    // for ever and every POST of it re-runs `confirm`, so without this a
    // reader re-opening their own link mails themselves another card each
    // time -- amplification through the very form double opt-in protects.
    welcomeSentAt: v.optional(v.number()),
    // Which drill went out last, so an emailed reply can be graded against
    // the right question without the reader quoting anything back.
    lastDrillId: v.optional(v.id("drills")),
    lastStoryId: v.optional(v.id("stories")),
    lastSentAt: v.optional(v.number()),
    // Which feeds this reader wants in the daily email. Absent means ["scam"],
    // which is what everyone who signed up before the other two feeds existed
    // actually asked for.
    kinds: v.optional(v.array(v.string())),
    // Proposed preferences never replace consented preferences until confirmed.
    pendingKinds: v.optional(v.array(v.string())),
  }).index("by_email", ["email"])
    .index("by_active", ["active"]),

  sentDrills: defineTable({
    subscriberId: v.id("subscribers"),
    messageId: v.string(),
    drillId: v.id("drills"),
    createdAt: v.number(),
  }).index("by_message", ["messageId"])
    .index("by_subscriber", ["subscriberId"]),

  // What each cron run actually achieved. Every cron in this app catches its
  // own per-item failures and returns counts, so a run that achieved nothing
  // still exits successfully and shows as green on the dashboard. `ok` is
  // judged on what a run FOUND rather than what it saved, because saving
  // nothing is the normal outcome of a six-hourly crawl. health.ts carries the
  // full reasoning.
  cronRuns: defineTable({
    job: v.string(),                  // one of health.ts CRON_JOBS
    ok: v.boolean(),
    detail: v.string(),               // the run's own counts, as it logged them
    startedAt: v.number(),
    finishedAt: v.number(),
  }).index("by_job_time", ["job", "startedAt"]),
});
