"use node";

import FirecrawlApp from "@mendable/firecrawl-js";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Source = {
  name: string;
  indexUrl: string;
  icon: string;
  // Each index page lists its articles in its own markdown shape.
  linkPattern: RegExp;
  // Whatever the site's robots.txt asks for, floored at 5s to stay under
  // Firecrawl's free-tier limit of about 13 requests a minute.
  delayMs: number;
  // Most index pages write [title](url). The AI Incident Database writes the
  // url first and the real title on a later line, so the groups are reversed.
  urlFirst?: boolean;
  // How deep to go by default. Every AIID entry is about AI, so it is worth
  // reading far more of than the government feeds, where most stories are
  // not about AI at all and get rejected.
  depth: number;
  // Which feed the crawled rows land in, and therefore which OpenAI pass
  // processes them. Absent means "scam", the original vertical.
  kind?: string;
  // Firecrawl's main-content filter is right for an article and wrong for an
  // index built in JavaScript: Hugging Face's course grid sits outside what
  // the filter calls main, so filtering it returns an empty page. This only
  // affects the index scrape; article scrapes always keep the filter on.
  indexAllContent?: boolean;
  // Some index pages label every link "More" and carry the real title only on
  // the page itself. The slug is the best hint available; the processing pass
  // rewrites the title from the page regardless.
  titleFromSlug?: boolean;
};

// "a-practical-guide-for-secure-mcp-server-development" -> readable words.
function slugToTitle(url: string): string {
  const slug = url.replace(/\/+$/, "").split("/").pop() ?? "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const SOURCES: Source[] = [
  {
    // Every entry here is about AI by definition, which is why it leads. The
    // incident records are CC BY-SA 4.0. Report text fields are NOT, so only
    // the AIID-written Description is taken, and each post links back.
    // The site serves no robots.txt.
    name: "AI Incident Database",
    indexUrl: "https://incidentdatabase.ai/summaries/incidents/",
    icon: "https://www.google.com/s2/favicons?domain=incidentdatabase.ai&sz=64",
    linkPattern:
      /^## \[Incident \d+\]\((https:\/\/incidentdatabase\.ai\/cite\/\d+\/)\)[\s\S]{0,240}?[“"]([^”"]{15,300})[”"]/gm,
    delayMs: 5000,
    urlFirst: true,
    depth: 45,
  },
  {
    // Public domain, and the only one of the two that reliably carries AI
    // scams: deepfaked officials, cloned voices, AI-built fake sites.
    // robots.txt allows /PSA/.
    name: "FBI IC3",
    indexUrl: "https://www.ic3.gov/PSA",
    icon: "https://www.google.com/s2/favicons?domain=ic3.gov&sz=64",
    linkPattern:
      /^\d+\.\s+\[(.+?)\]\((https:\/\/www\.ic3\.gov\/PSA\/\d{4}\/[^)]+)\)/gm,
    // ic3.gov robots.txt sets no crawl-delay.
    delayMs: 5000,
    depth: 14,
  },
  {
    // Public domain, and already written close to the reading level FlipSec
    // targets. Fewer AI stories, so it runs second.
    name: "FTC Consumer Alerts",
    indexUrl: "https://consumer.ftc.gov/consumer-alerts",
    icon: "https://www.google.com/s2/favicons?domain=consumer.ftc.gov&sz=64",
    linkPattern:
      /^### \[(.+?)\]\((https:\/\/consumer\.ftc\.gov\/consumer-alerts\/\d{4}\/\d{2}\/[^)]+)\)/gm,
    // consumer.ftc.gov robots.txt sets "Crawl-delay: 10".
    delayMs: 10000,
    depth: 10,
  },
  {
    // The AI Sec Edu feed. OWASP's Gen AI Security Project publishes the LLM
    // Top 10, agentic security guides, red teaming guidance and incident
    // response playbooks, all free, from a nonprofit. Hugging Face was here
    // first and was dropped: its courses teach you to build AI, not to secure
    // it, so every card failed the point of the feed.
    //
    // robots.txt is an empty Disallow, which allows everything, and sets no
    // crawl-delay. The index is JavaScript, so it needs indexAllContent.
    name: "OWASP Gen AI Security",
    indexUrl: "https://genai.owasp.org/resources/",
    icon: "https://www.google.com/s2/favicons?domain=genai.owasp.org&sz=64",
    // Every card's link says "More", so there is no title to capture here.
    // The slug carries it instead, and the model rewrites it properly from
    // the page anyway.
    linkPattern:
      /\[[^\]]{1,40}\]\((https:\/\/genai\.owasp\.org\/resource\/[a-z0-9-]+\/)\)/g,
    delayMs: 5000,
    depth: 20,
    kind: "course",
    indexAllContent: true,
    urlFirst: true,
    titleFromSlug: true,
  },
];

// FTC pages open with the .gov banner and put the article under a top level
// heading. IC3 pages open with a skip link and no heading at all.
function stripBoilerplate(markdown: string): string {
  // AIID pages carry their own prose under a Description label. Everything
  // above it is navigation, and the label introduces the CC licensed part.
  const description = markdown.indexOf("**Description**");
  if (description !== -1) return markdown.slice(description).trim();

  const heading = markdown.indexOf("\n# ");
  const body = heading === -1 ? markdown : markdown.slice(heading + 1);
  return body.replace(/^\[Skip to main[^\]]*\]\([^)]*\)\s*/i, "").trim();
}

type Alert = { title: string; url: string };

function parseIndex(
  markdown: string,
  pattern: RegExp,
  urlFirst = false,
  titleFromSlug = false,
): Alert[] {
  const alerts: Alert[] = [];
  const seen = new Set<string>();

  for (const match of markdown.matchAll(pattern)) {
    const [, first, second] = match;
    const url = urlFirst ? first : second;
    const title = titleFromSlug ? slugToTitle(url) : urlFirst ? second : first;
    // Some IC3 announcements are published as PDFs. Firecrawl can parse those
    // but they are slow and the layout is noisy, so skip them.
    if (url.toLowerCase().endsWith(".pdf")) continue;
    // OWASP publishes translations of its guides under percent-encoded slugs.
    // They are the same document, and a slug-derived title would be unusable.
    if (url.includes("%")) continue;
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
  args: { limit: v.optional(v.number()), only: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not set in Convex env vars");
    }

    // One source at a time keeps a deep crawl inside the action time limit.
    const sources = args.only
      ? SOURCES.filter((s) => s.name === args.only)
      : SOURCES;
    const firecrawl = new FirecrawlApp({ apiKey });

    let scraped = 0;
    let failed = 0;
    let found = 0;
    let first = true;

    for (const source of sources) {
      if (!first) await sleep(source.delayMs);
      first = false;

      let alerts: Alert[] = [];
      try {
        const index = await firecrawl.scrape(source.indexUrl, {
          formats: ["markdown"],
          onlyMainContent: source.indexAllContent !== true,
        });
        alerts = parseIndex(
          index.markdown ?? "",
          source.linkPattern,
          source.urlFirst,
          source.titleFromSlug,
        ).slice(0, args.limit ?? source.depth);
      } catch (error) {
        console.error(`failed to scrape index ${source.indexUrl}`, error);
        continue;
      }

      found += alerts.length;
      console.log(`${source.name}: found ${alerts.length} alerts`);

      for (const alert of alerts) {
        await sleep(source.delayMs);

        try {
          const article = await firecrawl.scrape(alert.url, {
            formats: ["markdown"],
            onlyMainContent: true,
          });

          const rawText = stripBoilerplate(article.markdown ?? "");
          // FTC publishes a purpose-made 1200x630 card per alert. IC3 does
          // not, and those posts fall back to tactic art in the feed.
          const image = article.metadata?.ogImage ?? undefined;
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
            image,
            rawText,
            kind: source.kind ?? "scam",
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

// Re-scrapes published stories that have no picture and patches in whatever
// og:image the source carries. Sources without one keep the tactic art.
export const backfillImages = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; patched: number }> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");

    const firecrawl = new FirecrawlApp({ apiKey });
    const missing: Array<{ storyId: Id<"stories">; url: string }> =
      await ctx.runQuery(internal.stories.listMissingImages, {});

    let patched = 0;
    for (const [i, story] of missing.entries()) {
      if (i > 0) await sleep(10000);
      try {
        const page = await firecrawl.scrape(story.url, {
          formats: ["markdown"],
          onlyMainContent: true,
        });
        const image = page.metadata?.ogImage;
        if (!image) continue;

        await ctx.runMutation(internal.stories.setImage, {
          storyId: story.storyId,
          image,
        });
        patched++;
      } catch (error) {
        console.error(`image backfill failed for ${story.url}`, error);
      }
    }

    console.log(`image backfill: ${patched} of ${missing.length}`);
    return { checked: missing.length, patched };
  },
});
