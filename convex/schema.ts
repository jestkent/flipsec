import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
  })
    .index("by_status", ["status"])
    .index("by_url", ["url"])
    .index("by_published", ["status", "publishedAt"]),

  drills: defineTable({
    storyId: v.id("stories"),
    prompt: v.string(),
    choices: v.array(v.string()),
    correct: v.number(),
    explanation: v.string(),
    steps: v.optional(v.array(v.string())),   // the three stages, shown on flip
    whyItWorks: v.optional(v.string()),       // why people fall for it
  }).index("by_story", ["storyId"]),

  attempts: defineTable({
    userId: v.string(),
    drillId: v.id("drills"),
    answer: v.string(),
    correct: v.optional(v.boolean()),
    feedback: v.optional(v.string()),
    source: v.string(),               // web | email
    createdAt: v.number(),
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
  }).index("by_user_time", ["userId", "createdAt"]),

  subscribers: defineTable({
    email: v.string(),
    userId: v.optional(v.string()),
    active: v.boolean(),
    // Which drill went out last, so an emailed reply can be graded against
    // the right question without the reader quoting anything back.
    lastDrillId: v.optional(v.id("drills")),
    lastStoryId: v.optional(v.id("stories")),
    lastSentAt: v.optional(v.number()),
  }).index("by_email", ["email"])
    .index("by_active", ["active"]),
});
