"use node";

import FirecrawlApp from "@mendable/firecrawl-js";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// consumer.ftc.gov sets "Crawl-delay: 10" in robots.txt, and Firecrawl's free
// tier allows about 13 requests a minute. 10s satisfies both.
const SCRAPE_DELAY_MS = 10000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Source = {
  name: string;
  indexUrl: string;
  icon: string;
  // Each index page lists its articles in its own markdown shape.
  linkPattern: RegExp;
};

const SOURCES: Source[] = [
  {
    // Public domain, and the only one of the two that reliably carries AI
    // scams: deepfaked officials, cloned voices, AI-built fake sites.
    // robots.txt allows /PSA/.
    name: "FBI IC3",
    indexUrl: "https://www.ic3.gov/PSA",
    icon: "https://www.google.com/s2/favicons?domain=ic3.gov&sz=64",
    linkPattern:
      /^\d+\.\s+\[(.+?)\]\((https:\/\/www\.ic3\.gov\/PSA\/\d{4}\/[^)]+)\)/gm,
  },
  {
    // Public domain, and already written close to the reading level FlipSec
    // targets. Fewer AI stories, so it runs second.
    name: "FTC Consumer Alerts",
    indexUrl: "https://consumer.ftc.gov/consumer-alerts",
    icon: "https://www.google.com/s2/favicons?domain=consumer.ftc.gov&sz=64",
    linkPattern:
      /^### \[(.+?)\]\((https:\/\/consumer\.ftc\.gov\/consumer-alerts\/\d{4}\/\d{2}\/[^)]+)\)/gm,
  },
];

// FTC pages open with the .gov banner and put the article under a top level
// heading. IC3 pages open with a skip link and no heading at all.
function stripBoilerplate(markdown: string): string {
  const heading = markdown.indexOf("\n# ");
  const body = heading === -1 ? markdown : markdown.slice(heading + 1);
  return body.replace(/^\[Skip to main[^\]]*\]\([^)]*\)\s*/i, "").trim();
}

type Alert = { title: string; url: string };

function parseIndex(markdown: string, pattern: RegExp): Alert[] {
  const alerts: Alert[] = [];
  const seen = new Set<string>();

  for (const match of markdown.matchAll(pattern)) {
    const [, title, url] = match;
    // Some IC3 announcements are published as PDFs. Firecrawl can parse those
    // but they are slow and the layout is noisy, so skip them.
    if (url.toLowerCase().endsWith(".pdf")) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    alerts.push({ title: title.trim(), url });
  }

  return alerts;
}

// Stage one scrapes each index for article links. Stage two scrapes each
// article for its body text. Actions do network calls only, so every write
// goes out through a scheduled mutation.
export const crawlSources = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not set in Convex env vars");
    }

    const limit = args.limit ?? 8;
    const firecrawl = new FirecrawlApp({ apiKey });

    let scraped = 0;
    let failed = 0;
    let found = 0;
    let first = true;

    for (const source of SOURCES) {
      if (!first) await sleep(SCRAPE_DELAY_MS);
      first = false;

      let alerts: Alert[] = [];
      try {
        const index = await firecrawl.scrape(source.indexUrl, {
          formats: ["markdown"],
          onlyMainContent: true,
        });
        alerts = parseIndex(index.markdown ?? "", source.linkPattern).slice(
          0,
          limit,
        );
      } catch (error) {
        console.error(`failed to scrape index ${source.indexUrl}`, error);
        continue;
      }

      found += alerts.length;
      console.log(`${source.name}: found ${alerts.length} alerts`);

      for (const alert of alerts) {
        await sleep(SCRAPE_DELAY_MS);

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
            source: source.name,
            sourceIcon: source.icon,
            rawText,
          });

          scraped++;
          console.log(`scraped ${rawText.length} chars: ${alert.title}`);
        } catch (error) {
          failed++;
          console.error(`failed to scrape ${alert.url}`, error);
        }
      }
    }

    console.log(`crawl done. found ${found}, scraped ${scraped}, failed ${failed}`);
    return { found, scraped, failed };
  },
});
