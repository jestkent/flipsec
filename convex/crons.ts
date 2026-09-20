import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 6 hours, per PLAN.md section 6. Each run re-scrapes the index pages;
// saveRawStory drops anything already seen, so only new alerts get processed.
crons.interval(
  "crawl sources",
  { hours: 6 },
  internal.crawl.crawlSources,
  { limit: 15 },
);

// Remote OK is a JSON feed rather than a Firecrawl crawl, so it runs on its
// own schedule. Job listings turn over faster than advisories do, and this
// costs one request.
crons.interval(
  "crawl jobs",
  { hours: 6 },
  internal.jobs.crawlJobs,
  { limit: 25 },
);

// Daily drill, per PLAN.md section 6. UTC, so 7am Pacific is 14:00 UTC.
crons.cron(
  "send daily drill",
  "0 14 * * *",
  internal.email.sendDailyDrill,
  {},
);

export default crons;
