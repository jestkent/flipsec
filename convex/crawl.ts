"use node";

import FirecrawlApp from "@mendable/firecrawl-js";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// FTC consumer alerts. US government work, public domain, and already written
// at roughly the reading level FlipSec targets.
const SOURCE = {
  name: "FTC Consumer Alerts",
  indexUrl: "https://consumer.ftc.gov/consumer-alerts",
  icon: "https://www.google.com/s2/favicons?domain=consumer.ftc.gov&sz=64",
};

// The index page lists each alert as a markdown heading linking to the article.
const ALERT_LINK = /^### \[(.+?)\]\((https:\/\/consumer\.ftc\.gov\/consumer-alerts\/\d{4}\/\d{2}\/[^)]+)\)/gm;

// Every FTC page opens with the same "official website" banner. Drop everything
// before the first top level heading so the model sees the article, not chrome.
function stripBoilerplate(markdown: string): string {
  const heading = markdown.indexOf("\n# ");
  return (heading === -1 ? markdown : markdown.slice(heading + 1)).trim();
}

// Firecrawl's free tier allows about 13 requests a minute. Space the article
// scrapes out so a long crawl does not lose its tail to a 429.
const SCRAPE_DELAY_MS = 6000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Alert = { title: string; url: string };

function parseIndex(markdown: string): Alert[] {
  const alerts: Alert[] = [];
  const seen = new Set<string>();

  for (const match of markdown.matchAll(ALERT_LINK)) {
    const [, title, url] = match;
    if (seen.has(url)) continue;
    seen.add(url);
    alerts.push({ title: title.trim(), url });
  }

  return alerts;
}

// Stage one scrapes the index for article links. Stage two scrapes each article
// for its body text. Actions do network calls only, so every write goes out
// through a scheduled mutation.
export const crawlSources = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not set in Convex env vars");
    }

    const limit = args.limit ?? 12;
    const firecrawl = new FirecrawlApp({ apiKey });

    const index = await firecrawl.scrape(SOURCE.indexUrl, {
      formats: ["markdown"],
      onlyMainContent: true,
    });

    const alerts = parseIndex(index.markdown ?? "").slice(0, limit);
    console.log(`found ${alerts.length} alerts on ${SOURCE.indexUrl}`);

    let scraped = 0;
    let failed = 0;

    for (const [i, alert] of alerts.entries()) {
      if (i > 0) await sleep(SCRAPE_DELAY_MS);

      try {
        const article = await firecrawl.scrape(alert.url, {
          formats: ["markdown"],
          onlyMainContent: true,
        });

        const rawText = stripBoilerplate(article.markdown ?? "");
        if (rawText.length < 200) {
          console.warn(`skipping ${alert.url}, only ${rawText.length} chars`);
          failed++;
          continue;
        }

        await ctx.scheduler.runAfter(0, internal.stories.saveRawStory, {
          url: alert.url,
          title: alert.title,
          source: SOURCE.name,
          sourceIcon: SOURCE.icon,
          rawText,
        });

        scraped++;
        console.log(`scraped ${rawText.length} chars: ${alert.title}`);
      } catch (error) {
        failed++;
        console.error(`failed to scrape ${alert.url}`, error);
      }
    }

    console.log(`crawl done. scraped ${scraped}, failed ${failed}`);
    return { found: alerts.length, scraped, failed };
  },
});
