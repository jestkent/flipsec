import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 6 hours, per PLAN.md section 6. Each run re-scrapes the index pages;
// saveRawStory drops anything already seen, so only new alerts get processed.
crons.interval(
  "crawl sources",
  { hours: 6 },
  internal.crawl.crawlSources,
  { limit: 8 },
);

export default crons;
