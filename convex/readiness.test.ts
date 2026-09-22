/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { api, internal, components } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
function backend() { const t = convexTest(schema, modules); agentTest.register(t); return t; }
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network call"); })); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

test("private conversations require the owning session, not a reader ID or another session", async () => {
  const t = backend();
  const first = await t.mutation(api.browserSessions.create, {});
  const second = await t.mutation(api.browserSessions.create, {});
  const userId = (await t.query(internal.browserSessions.owner, { token: first.token }))!;
  const thread = await t.mutation(components.agent.threads.createThread, { userId });
  await t.mutation(internal.assistantData.registerThread, { userId, threadId: thread._id });
  await t.mutation(components.agent.messages.addMessages, {
    threadId: thread._id, userId,
    messages: [{ message: { role: "user", content: "A private question" } }],
  });
  expect(await t.query(api.assistantMessages.list, { sessionToken: first.token, threadId: thread._id })).toEqual([
    expect.objectContaining({ text: "A private question" }),
  ]);
  expect(await t.query(api.assistantMessages.list, { userId, threadId: thread._id })).toEqual([]);
  expect(await t.query(api.assistantMessages.list, { sessionToken: second.token, userId, threadId: thread._id })).toEqual([]);
  await expect(t.action(api.assistant.ask, { userId, threadId: thread._id, question: "Read my messages" })).rejects.toThrow("private session");
  await expect(t.action(api.assistant.ask, { sessionToken: second.token, userId, threadId: thread._id, question: "Read my messages" })).rejects.toThrow("no longer available");
  await expect(t.action(api.assistant.remove, { sessionToken: second.token, userId, threadId: thread._id })).rejects.toThrow("no longer available");
  await t.action(api.assistant.remove, { sessionToken: first.token, threadId: thread._id });
  expect(await t.query(api.assistantMessages.list, { sessionToken: first.token, threadId: thread._id })).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});

test("session secrets are hashed and expiration revokes access even before cleanup runs", async () => {
  const t = backend();
  const session = await t.mutation(api.browserSessions.create, {});
  const rows = await t.run((ctx) => ctx.db.query("browserSessions").collect());
  expect(rows).toHaveLength(1);
  expect(JSON.stringify(rows)).not.toContain(session.token);
  expect(await t.query(internal.browserSessions.owner, { token: "a".repeat(64) })).toBeNull();
  vi.setSystemTime(session.expiresAt + 1);
  expect(await t.query(internal.browserSessions.owner, { token: session.token })).toBeNull();
  await t.mutation(internal.browserSessions.expire, { id: rows[0]._id });
  expect(await t.run((ctx) => ctx.db.get(rows[0]._id))).toBeNull();
});

test("legacy browser threads cannot be claimed using the old public reader identifier", async () => {
  const t = backend();
  await t.mutation(internal.assistantData.registerThread, { userId: "known-reader", threadId: "legacy-thread" });
  const session = await t.mutation(api.browserSessions.create, {});
  expect(await t.query(api.assistantMessages.list, { userId: "known-reader", sessionToken: session.token, threadId: "legacy-thread" })).toEqual([]);
  await expect(t.action(api.assistant.remove, { userId: "known-reader", threadId: "legacy-thread" })).rejects.toThrow("private session");
});

test("closed jobs leave feeds, permalinks and daily mail; stale checks cannot resurrect them", async () => {
  const t = backend();
  const now = Date.now();
  const id = await t.run((ctx) => ctx.db.insert("stories", {
    kind: "job", title: "Safety role", source: "Anthropic", url: "https://example.invalid/job", status: "published", crawledAt: now - 100,
  }));
  await t.mutation(internal.jobAvailability.reconcile, { source: "Wrong company", checkedAt: now, jobs: [{ id, open: false }] });
  expect(await t.query(api.stories.publishedStory, { storyId: id })).not.toBeNull();
  await t.mutation(internal.jobAvailability.reconcile, { source: "Anthropic", checkedAt: now, jobs: [{ id, open: false }] });
  expect(await t.query(api.stories.listPublished, { kind: "job" })).toEqual([]);
  expect(await t.query(api.stories.publishedStory, { storyId: id })).toBeNull();
  expect(await t.query(internal.subscribers.listCards, { kind: "job" })).toEqual([]);
  await t.mutation(internal.jobAvailability.reconcile, { source: "Anthropic", checkedAt: now - 1, jobs: [{ id, open: true }] });
  expect(await t.query(api.stories.publishedStory, { storyId: id })).toBeNull();
  await t.mutation(internal.jobAvailability.reconcile, { source: "Anthropic", checkedAt: now + 1, jobs: [{ id, open: true }] });
  expect(await t.query(api.stories.listPublished, { kind: "job" })).toHaveLength(1);
});

test("failed and malformed employer responses never retire published jobs", async () => {
  const t = backend();
  const id = await t.run((ctx) => ctx.db.insert("stories", {
    kind: "job", title: "Safety role", source: "Anthropic", url: "https://example.invalid/job", status: "published", crawledAt: Date.now() - 100,
  }));
  for (const reply of [
    () => new Response("unavailable", { status: 503 }),
    () => new Response(JSON.stringify({ error: "missing jobs" })),
    () => new Response(JSON.stringify({ jobs: [], meta: { total: 12 } })),
  ]) {
    vi.stubGlobal("fetch", vi.fn(async () => reply()));
    await t.action(internal.jobs.crawlJobs, {});
    expect(await t.query(api.stories.publishedStory, { storyId: id })).not.toBeNull();
  }
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ jobs: [], meta: { total: 0 } }))));
  await t.action(internal.jobs.crawlJobs, {});
  expect(await t.query(api.stories.publishedStory, { storyId: id })).toBeNull();
});

test("session expiry revokes access and removes the associated agent conversation", async () => {
  const t = backend();
  const session = await t.mutation(api.browserSessions.create, {});
  const userId = (await t.query(internal.browserSessions.owner, { token: session.token }))!;
  const thread = await t.mutation(components.agent.threads.createThread, { userId });
  await t.mutation(internal.assistantData.registerThread, { userId, threadId: thread._id });
  const rows = await t.run((ctx) => ctx.db.query("browserSessions").collect());
  await t.mutation(internal.browserSessions.expire, { id: rows[0]._id });
  expect(await t.query(api.assistantMessages.list, { sessionToken: session.token, threadId: thread._id })).toEqual([]);
  for (let step = 0; step < 5; step++) {
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
  }
  expect(await t.query(components.agent.threads.getThread, { threadId: thread._id })).toBeNull();
});

test("fresh signup follows its generated mail link and only POST enables delivery", async () => {
  const t = backend();
  vi.stubEnv("AGENTMAIL_API_KEY", "test-key");
  vi.stubEnv("AGENTMAIL_INBOX_ID", "test@example.invalid");
  vi.stubEnv("WEBHOOK_SECRET", "test-secret");
  let mail = "";
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
    mail = JSON.parse(init.body).text;
    return new Response(JSON.stringify({ message_id: "test-confirmation" }));
  }));
  await t.mutation(api.subscribers.subscribe, { email: "new-reader@example.invalid", userId: "new-browser", kinds: ["scam"] });
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
  const link = new URL(mail.match(/https:\/\/\S+\/api\/confirm\?\S+/)![0]);
  expect((await t.query(internal.subscribers.activePage, { paginationOpts: { cursor: null, numItems: 20 } })).page).toEqual([]);
  expect((await t.fetch(`/confirm${link.search}`)).status).toBe(200);
  expect((await t.query(internal.subscribers.activePage, { paginationOpts: { cursor: null, numItems: 20 } })).page).toEqual([]);
  link.searchParams.set("k", "scam");
  await t.fetch("/confirm", { method: "POST", body: link.searchParams });
  expect((await t.query(internal.subscribers.activePage, { paginationOpts: { cursor: null, numItems: 20 } })).page).toEqual([
    expect.objectContaining({ email: "new-reader@example.invalid", kinds: ["scam"] }),
  ]);
});

// "A" is exactly what somebody sends back to a multiple-choice drill. It used
// to return with no mail and no log, so a reader who did what the daily email
// told them to do heard nothing at all. Silence is the one answer this
// product must never give.
test("an emailed reply too short to answer gets a reply rather than silence", async () => {
  const t = backend();
  const subscriberId = await t.run((ctx) =>
    ctx.db.insert("subscribers", { email: "short@example.invalid", active: true, kinds: ["scam"] }),
  );

  await t.action(internal.assistant.answerByEmail, {
    subscriberId,
    to: "short@example.invalid",
    question: "A",
    replyToMessageId: "<drill-1@example.invalid>",
  });

  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  const replies = scheduled.filter((job) => job.name.includes("sendAssistantReply"));
  expect(replies).toHaveLength(1);
  expect(replies[0].args[0]).toMatchObject({
    to: "short@example.invalid",
    replyToMessageId: "<drill-1@example.invalid>",
  });
  // No thread was created, so no model call was made for a one-letter reply.
  expect(await t.run((ctx) => ctx.db.query("assistantThreads").collect())).toEqual([]);
});
