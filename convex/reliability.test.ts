/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { matchesTranslation } from "./localizationData";
import { confirmToken } from "./http";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const makeTest = () => convexTest(schema, modules);
type Backend = ReturnType<typeof makeTest>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-21T18:00:00Z"));
  vi.stubEnv("AGENTMAIL_API_KEY", "test-key");
  vi.stubEnv("AGENTMAIL_INBOX_ID", "test@example.invalid");
  vi.stubEnv("WEBHOOK_SECRET", "test-secret");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request in test"); }));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

async function seed(t: Backend, email = "reader@example.invalid") {
  return t.run(async (ctx) => {
    const subscriberId = await ctx.db.insert("subscribers", { email, userId: email, active: true, kinds: ["scam"] });
    const storyId = await ctx.db.insert("stories", { url: "https://example.invalid/story", title: "A fake call", source: "Test", kind: "scam", status: "published", crawledAt: Date.now(), summary: "Someone asks for money.", redFlags: ["urgency"] });
    const drillId = await ctx.db.insert("drills", { storyId, prompt: "What should you check?", choices: ["Spelling", "Identity", "Colour"], correct: 1, explanation: "Verify independently." });
    return { subscriberId, storyId, drillId };
  });
}

test("a stranger cannot reactivate an unsubscribed address", async () => {
  const t = makeTest();
  const { subscriberId } = await seed(t);
  await t.mutation(internal.subscribers.deactivate, { email: "reader@example.invalid" });
  const result = await t.mutation(api.subscribers.subscribe, { email: "reader@example.invalid", userId: "stranger", kinds: ["job"] });
  expect(result.confirm).toBe(true);
  expect(await t.run((ctx) => ctx.db.get(subscriberId))).toMatchObject({ active: false, kinds: ["scam"], pendingKinds: ["scam", "job"] });
  expect((await t.query(internal.subscribers.activePage, { paginationOpts: { cursor: null, numItems: 20 } })).page).toEqual([]);
});

test("proposed feeds do not change a confirmed subscription until mailbox confirmation", async () => {
  const t = makeTest();
  const { subscriberId } = await seed(t);
  await t.mutation(api.subscribers.subscribe, { email: "reader@example.invalid", userId: "stranger", kinds: ["job"] });
  expect(await t.run((ctx) => ctx.db.get(subscriberId))).toMatchObject({ active: true, kinds: ["scam"], pendingKinds: ["scam", "job"] });
  await t.mutation(internal.subscribers.confirm, { email: "reader@example.invalid", kinds: ["job"] });
  const row = await t.run((ctx) => ctx.db.get(subscriberId));
  expect(row).toMatchObject({ active: true, pending: false, kinds: ["job"] });
  expect(row?.pendingKinds).toBeUndefined();
});

test("pending requests merge without sending duplicate confirmations", async () => {
  const t = makeTest();
  await t.mutation(api.subscribers.subscribe, { email: "new@example.invalid", userId: "reader", kinds: ["scam"] });
  await t.mutation(api.subscribers.subscribe, { email: "new@example.invalid", userId: "reader", kinds: ["job"] });
  const schedules = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(schedules).toHaveLength(1);
  expect(await t.query(internal.subscribers.pendingFor, { email: "new@example.invalid" })).toEqual({ pending: true, kinds: ["scam", "job"] });
});

test("pagination reaches confirmed readers after more than 200 pending rows", async () => {
  const t = makeTest();
  await t.run(async (ctx) => {
    for (let i = 0; i < 205; i++) await ctx.db.insert("subscribers", { email: `pending-${i}@example.invalid`, active: true, pending: true });
    await ctx.db.insert("subscribers", { email: "confirmed@example.invalid", active: true });
  });
  let cursor: string | null = null;
  const emails: string[] = [];
  for (;;) {
    const page: { page: Array<{ email: string }>; isDone: boolean; continueCursor: string } = await t.query(internal.subscribers.activePage, { paginationOpts: { cursor, numItems: 20 } });
    emails.push(...page.page.map((s) => s.email));
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  expect(emails).toEqual(["confirmed@example.invalid"]);
});

test("news cannot be translated until the drill exists", async () => {
  const t = makeTest();
  const { storyId, drillId } = await seed(t);
  await t.run((ctx) => ctx.db.delete(drillId));
  expect(await t.query(internal.localizationData.storySource, { storyId, language: "es" })).toBeNull();
  await expect(t.mutation(internal.localizationData.saveStory, { storyId, language: "es", content: {} })).rejects.toThrow("not ready");
});

test("old translations with a missing drill are replaceable, not permanent cache hits", async () => {
  const t = makeTest();
  const { storyId } = await seed(t);
  const original = await t.query(internal.localizationData.storySource, { storyId, language: "es" });
  await t.run((ctx) => ctx.db.insert("storyTranslations", { storyId, language: "es", content: { ...original!.source, drill: null }, createdAt: Date.now() }));
  expect(await t.query(api.localizationData.story, { storyId, language: "es" })).toBeNull();
  expect(await t.query(internal.localizationData.untranslated, { language: "es" })).toContain(storyId);
  await t.mutation(internal.localizationData.saveStory, { storyId, language: "es", content: original!.source, sourceHash: original!.sourceHash });
  expect(await t.query(api.localizationData.story, { storyId, language: "es" })).toEqual(original!.source);
});

test("a model result cannot overwrite a newer source version", async () => {
  const t = makeTest();
  const { storyId } = await seed(t);
  const old = await t.query(internal.localizationData.storySource, { storyId, language: "es" });
  await t.run((ctx) => ctx.db.patch(storyId, { summary: "Updated facts." }));
  await expect(t.mutation(internal.localizationData.saveStory, { storyId, language: "es", content: old!.source, sourceHash: old!.sourceHash })).rejects.toThrow("complete current card");
});

test("translation validates arrays, types and links while preserving Claude's identifier fix", async () => {
  const t = makeTest();
  const { storyId } = await seed(t);
  await t.run((ctx) => ctx.db.patch(storyId, { kind: "course", back: { demo: "prompt-injection", title: "Try this" } }));
  const context = await t.query(internal.localizationData.storySource, { storyId, language: "es" });
  expect(context!.source.back).toEqual({ title: "Try this" });
  expect(matchesTranslation({ choices: ["one", "two"] }, { choices: ["uno"] })).toBe(false);
  expect(matchesTranslation({ url: "https://example.invalid" }, { url: "https://changed.invalid" })).toBe(false);
  expect(matchesTranslation({ title: "Hi" }, { title: 42 })).toBe(false);
});

test("a late reply targets its original sent drill rather than the latest one", async () => {
  const t = makeTest();
  const { subscriberId, storyId, drillId } = await seed(t);
  await t.mutation(internal.subscribers.markSent, { subscriberId, storyId, drillId, messageId: "<yesterday@example.invalid>" });
  const latest = await t.run((ctx) => ctx.db.insert("drills", { storyId, prompt: "Different question", choices: ["a", "b", "c"], correct: 2, explanation: "Different reason" }));
  await t.mutation(internal.subscribers.markSent, { subscriberId, storyId, drillId: latest, messageId: "<today@example.invalid>" });
  await t.mutation(internal.attempts.saveReply, { from: "reader@example.invalid", body: "Identity", inReplyTo: "<yesterday@example.invalid>" });
  const attempts = await t.run((ctx) => ctx.db.query("attempts").collect());
  expect(attempts).toHaveLength(1);
  expect(attempts[0].drillId).toBe(drillId);
});

test("unmatched mail and another subscriber's message cannot select a drill", async () => {
  const t = makeTest();
  const { subscriberId, storyId, drillId } = await seed(t);
  await t.mutation(internal.subscribers.markSent, { subscriberId, storyId, drillId, messageId: "<original@example.invalid>" });
  await t.run((ctx) => ctx.db.insert("subscribers", { email: "other@example.invalid", active: true }));
  await t.mutation(internal.attempts.saveReply, { from: "reader@example.invalid", body: "No reference" });
  await t.mutation(internal.attempts.saveReply, { from: "other@example.invalid", body: "Identity", inReplyTo: "<original@example.invalid>" });
  expect(await t.run((ctx) => ctx.db.query("attempts").collect())).toEqual([]);
});

test("references fallback and duplicate replies create only one attempt", async () => {
  const t = makeTest();
  const { subscriberId, storyId, drillId } = await seed(t);
  await t.mutation(internal.subscribers.markSent, { subscriberId, storyId, drillId, messageId: "<original@example.invalid>" });
  const reply = { from: "reader@example.invalid", body: "Identity", references: ["<original@example.invalid>"] };
  await t.mutation(internal.attempts.saveReply, reply);
  await t.mutation(internal.attempts.saveReply, reply);
  expect(await t.run((ctx) => ctx.db.query("attempts").collect())).toHaveLength(1);
});

test("web retries return the recorded answer and reject fractional choices", async () => {
  const t = makeTest();
  const { drillId } = await seed(t);
  const args = { userId: "reader", drillId };
  await expect(t.mutation(api.attempts.submitAnswer, { ...args, choice: 0.5 })).rejects.toThrow("out of range");
  await t.mutation(api.attempts.submitAnswer, { ...args, choice: 0 });
  expect(await t.mutation(api.attempts.submitAnswer, { ...args, choice: 1 })).toMatchObject({ correct: false });
  expect(await t.run((ctx) => ctx.db.query("attempts").collect())).toHaveLength(1);
});

async function gradedAttempt(t: Backend) {
  const { drillId } = await seed(t);
  return t.run((ctx) => ctx.db.insert("attempts", { userId: "reader@example.invalid", drillId, answer: "Identity", source: "email", createdAt: Date.now() }));
}

test("feedback retries use one provider key and stop after delivery", async () => {
  const t = makeTest();
  const attemptId = await gradedAttempt(t);
  const mock = vi.fn()
    .mockResolvedValueOnce(new Response("temporary failure", { status: 503 }))
    .mockImplementation(async () => new Response(JSON.stringify({ message_id: "<feedback@example.invalid>" }), { status: 200 }));
  vi.stubGlobal("fetch", mock);
  await t.mutation(internal.attempts.saveGrade, { attemptId, correct: true, feedback: "You checked identity.", to: "reader@example.invalid", rightAnswer: "Identity", explanation: "Verify independently." });
  expect(await t.run((ctx) => ctx.db.get(attemptId))).toMatchObject({ correct: true, deliveryStatus: "pending" });
  await drainDelivery(t);
  expect(mock).toHaveBeenCalledTimes(2);
  const first = mock.mock.calls[0][1] as RequestInit;
  const second = mock.mock.calls[1][1] as RequestInit;
  expect(first.headers).toMatchObject({ "Idempotency-Key": `grade-${attemptId}` });
  expect(second.headers).toEqual(first.headers);
  expect(second.body).toBe(first.body);
  expect(await t.run((ctx) => ctx.db.get(attemptId))).toMatchObject({ deliveryStatus: "sent", deliveryAttempts: 2, deliveryMessageId: "<feedback@example.invalid>" });
});

test("feedback retries are bounded and failures stay inspectable", async () => {
  const t = makeTest();
  const attemptId = await gradedAttempt(t);
  const mock = vi.fn().mockImplementation(async () => new Response("down", { status: 503 }));
  vi.stubGlobal("fetch", mock);
  await t.mutation(internal.attempts.saveGrade, { attemptId, correct: false, feedback: "Check identity.", to: "reader@example.invalid" });
  await drainDelivery(t);
  expect(mock).toHaveBeenCalledTimes(5);
  expect(await t.run((ctx) => ctx.db.get(attemptId))).toMatchObject({ deliveryStatus: "failed", deliveryAttempts: 5, feedback: "Check identity." });
});

test("unsubscribing cancels pending feedback without a send", async () => {
  const t = makeTest();
  const attemptId = await gradedAttempt(t);
  await t.mutation(internal.attempts.saveGrade, { attemptId, correct: true, feedback: "Yes", to: "reader@example.invalid" });
  await t.mutation(internal.subscribers.deactivate, { email: "reader@example.invalid" });
  await drainDelivery(t);
  expect(fetch).not.toHaveBeenCalled();
  expect(await t.run((ctx) => ctx.db.get(attemptId))).toMatchObject({ deliveryStatus: "failed" });
});

async function drainDelivery(t: Backend) {
  for (let i = 0; i < 7; i++) {
    vi.advanceTimersByTime(65_000);
    await t.finishInProgressScheduledFunctions();
  }
}

test("confirmation GET is read-only and signed POST applies consent", async () => {
  const t = makeTest();
  const { subscriberId } = await seed(t);
  await t.mutation(internal.subscribers.deactivate, { email: "reader@example.invalid" });
  const token = await confirmToken("reader@example.invalid");
  const path = `/confirm?e=reader%40example.invalid&t=${token}`;
  expect((await t.fetch(path)).status).toBe(200);
  expect((await t.run((ctx) => ctx.db.get(subscriberId)))?.active).toBe(false);
  await t.fetch("/confirm", { method: "POST", body: new URLSearchParams({ e: "reader@example.invalid", t: "forged", kinds: "job" }) });
  expect((await t.run((ctx) => ctx.db.get(subscriberId)))?.active).toBe(false);
  await t.fetch("/confirm", { method: "POST", body: new URLSearchParams({ e: "reader@example.invalid", t: token, k: "job" }) });
  expect(await t.run((ctx) => ctx.db.get(subscriberId))).toMatchObject({ active: true, pending: false, kinds: ["job"] });
});

test("malformed signed webhook fields return 400", async () => {
  const t = makeTest();
  for (const body of [null, { event_type: "message.received", message: { from: 42 } }, { event_type: "message.received", message: { from: "reader@example.invalid", references: [42] } }]) {
    const response = await t.fetch("/agentmail-inbound", { method: "POST", headers: { "x-flipsec-secret": "test-secret" }, body: JSON.stringify(body) });
    expect(response.status).toBe(400);
  }
});

test("card permalinks expose only published content and never raw source text", async () => {
  const t = makeTest();
  const { storyId } = await seed(t);
  await t.run((ctx) => ctx.db.patch(storyId, { rawText: "private source body" }));
  expect(await t.query(api.stories.publishedStory, { storyId })).not.toHaveProperty("rawText");
  await t.run((ctx) => ctx.db.patch(storyId, { status: "raw" }));
  expect(await t.query(api.stories.publishedStory, { storyId })).toBeNull();
  expect(await t.query(api.stories.publishedStory, { storyId: "invalid" })).toBeNull();
});

test("a lost send response reuses the provider result without another email", async () => {
  const t = makeTest();
  const attemptId = await gradedAttempt(t);
  const accepted = new Map<string, string>();
  let delivered = 0;
  const mock = vi.fn(async (_url: string, init: RequestInit) => {
    const key = new Headers(init.headers).get("Idempotency-Key")!;
    const body = String(init.body);
    if (!accepted.has(key)) {
      accepted.set(key, body);
      delivered++;
      throw new Error("Response lost after provider accepted the send");
    }
    expect(body).toBe(accepted.get(key));
    return new Response(JSON.stringify({ message_id: "<accepted@example.invalid>" }));
  });
  vi.stubGlobal("fetch", mock);
  await t.mutation(internal.attempts.saveGrade, { attemptId, correct: true, feedback: "Yes", to: "reader@example.invalid" });
  await drainDelivery(t);
  expect(mock).toHaveBeenCalledTimes(2);
  expect(delivered).toBe(1);
  expect(await t.run((ctx) => ctx.db.get(attemptId))).toMatchObject({ deliveryStatus: "sent" });
});
