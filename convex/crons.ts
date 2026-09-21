import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { CRON_JOBS } from "./health";

const crons = cronJobs();

// Every 6 hours, per PLAN.md section 6. Each run re-scrapes the index pages;
// saveRawStory drops anything already seen, so only new alerts get processed.
crons.interval(
  CRON_JOBS.crawlSources,
  { hours: 6 },
  internal.crawl.crawlSources,
  { limit: 15 },
);

// Greenhouse is a JSON API rather than a Firecrawl crawl, so it runs on its
// own schedule. Job listings turn over faster than advisories do, and the
// list endpoint costs one request per board.
crons.interval(
  CRON_JOBS.crawlJobs,
  { hours: 6 },
  internal.jobs.crawlJobs,
  { limit: 25 },
);

// Daily drill, per PLAN.md section 6. UTC, so 7am Pacific is 14:00 UTC.
crons.cron(
  CRON_JOBS.dailyDrill,
  "0 14 * * *",
  internal.email.sendDailyDrill,
  {},
);

export default crons;
