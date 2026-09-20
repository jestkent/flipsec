import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  stories: defineTable({
    url: v.string(),
    title: v.string(),
    source: v.string(),
    sourceIcon: v.optional(v.string()),
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

  subscribers: defineTable({
    email: v.string(),
    userId: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_email", ["email"]),
});
