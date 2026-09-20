import FirecrawlApp from "@mendable/firecrawl-js";
import { internalAction } from "./_generated/server";

// FTC consumer alerts. Public domain, written for ordinary people.
const FTC_ALERTS_URL = "https://consumer.ftc.gov/consumer-alerts";

// Milestone 1 step 3: prove that usable text comes back from Firecrawl.
// No database writes here yet. Actions never touch ctx.db.
export const crawlSources = internalAction({
  args: {},
  handler: async () => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not set in Convex env vars");
    }

    const firecrawl = new FirecrawlApp({ apiKey });

    const result = await firecrawl.scrape(FTC_ALERTS_URL, {
      formats: ["markdown", "links"],
      onlyMainContent: true,
    });

    const markdown = result.markdown ?? "";
    const links = result.links ?? [];

    console.log("source:", FTC_ALERTS_URL);
    console.log("title:", result.metadata?.title);
    console.log("markdown length:", markdown.length);
    console.log("link count:", links.length);
    console.log("--- first 2000 chars of markdown ---");
    console.log(markdown.slice(0, 2000));
    console.log("--- first 30 links ---");
    console.log(links.slice(0, 30).join("\n"));

    return {
      title: result.metadata?.title,
      markdownLength: markdown.length,
      linkCount: links.length,
    };
  },
});
