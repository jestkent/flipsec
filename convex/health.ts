import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// AUDIT.md section 8 item 7: nothing watched the crons, so a broken one failed
// silently for days.
//
// The SHAPE of the failure is what this is built around. crawlSources,
// crawlJobs and sendDailyDrill each catch their own per-source, per-article
// and per-subscriber errors and return counts, so none of them throws when a
// run achieves nothing. Convex records a successful execution and the
// dashboard shows green. A crawl that quietly stopped matching an index page
// looks exactly like a crawl that found nothing new.
//
// That leaves two distinct failures needing two different signals:
//
//   - A run that THROWS is already loud. Convex logs an uncaught error and the
//     dashboard shows it. Nothing is recorded here, which is the point: the
//     job's last row simply stops advancing, so staleness is the tell.
//   - A run that SUCCEEDS having achieved nothing is the silent one, and that
//     is what `ok` is for.
//
// `ok` is judged on what a run FOUND, never on what it saved. A crawl that
// found 14 alerts and saved none is healthy: saveRawStory drops anything
// already seen, which is the normal outcome of most six-hourly runs. Judging
// on saved would cry wolf four times a day and teach whoever reads it to
// ignore the signal. A crawl that found ZERO has stopped parsing its index.

// The three crons, under the exact names crons.ts registers them with. One
// list, the way TABS is the one list of feeds — a cron that is not in here is
// a cron nobody is watching.
export const CRON_JOBS = {
  crawlSources: "crawl sources",
  crawlJobs: "crawl jobs",
  dailyDrill: "send daily drill",
} as const;

// Called through the scheduler by each cron action, because an action never
// touches ctx.db.
export const recordRun = internalMutation({
  args: {
    job: v.string(),
    ok: v.boolean(),
    detail: v.string(),
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cronRuns", {
      job: args.job,
      ok: args.ok,
      detail: args.detail,
      startedAt: args.startedAt,
      finishedAt: Date.now(),
    });

    // Loud in the logs as well as on the row. Someone reading the Convex
    // dashboard after a report of a stale feed should find this without
    // knowing the table exists.
    if (!args.ok) {
      console.error(`CRON UNHEALTHY ${args.job}: ${args.detail}`);
    }

    return null;
  },
});

// "Is anything quietly broken?", in one call:
//
//   npx convex run health:status --prod
//
// Returns the last run of each cron. Deliberately does NOT compute how old
// that is: a query is not rerun merely because time advances, so a staleness
// figure derived from the clock inside here would be wrong the moment it was
// cached. The timestamps come back as ISO strings, which is what makes a job
// that stopped running days ago obvious to the reader.
export const status = internalQuery({
  args: {},
  handler: async (ctx) => {
    const jobs = Object.values(CRON_JOBS);
    const rows = [];

    for (const job of jobs) {
      const last = await ctx.db
        .query("cronRuns")
        .withIndex("by_job_time", (q) => q.eq("job", job))
        .order("desc")
        .first();

      rows.push({
        job,
        // No row at all means this cron has not completed once since the
        // recording shipped. On a job that runs every six hours that is
        // itself the answer.
        ok: last?.ok ?? null,
        detail: last?.detail ?? "no run recorded",
        lastRunAt: last ? new Date(last.startedAt).toISOString() : null,
      });
    }

    return rows;
  },
});

// The last few runs of one job, for when `status` says something is wrong and
// the question becomes when it started.
export const history = internalQuery({
  args: { job: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Clamped for the same reason listPublished clamps: a caller does not
    // choose how much we read.
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 100);

    const runs = await ctx.db
      .query("cronRuns")
      .withIndex("by_job_time", (q) => q.eq("job", args.job))
      .order("desc")
      .take(limit);

    return runs.map((run) => ({
      ok: run.ok,
      detail: run.detail,
      startedAt: new Date(run.startedAt).toISOString(),
      seconds: Math.round((run.finishedAt - run.startedAt) / 1000),
    }));
  },
});
