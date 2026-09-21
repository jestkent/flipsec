"use node";

import FirecrawlApp from "@mendable/firecrawl-js";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Dev-only helper for evaluating a candidate source before wiring it into the
// pipeline. Logs what Firecrawl returns. Writes nothing.
export const probeSource = internalAction({
  args: {
    url: v.string(),
    chars: v.optional(v.number()),
    // Some index pages build their list in JavaScript and hang it outside
    // whatever Firecrawl decides the main content is, which comes back as an
    // empty page. Turning the filter off shows whether the list is there at
    // all before a source gets written off.
    all: v.optional(v.boolean()),
    waitMs: v.optional(v.number()),
    grep: v.optional(v.string()),
    // Print the link list rather than the markdown. An index whose rows are
    // not links in the markdown can still expose its targets here.
    showLinks: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");

    const firecrawl = new FirecrawlApp({ apiKey });
    const result = await firecrawl.scrape(args.url, {
      formats: ["markdown", "links"],
      onlyMainContent: args.all !== true,
      ...(args.waitMs ? { waitFor: args.waitMs } : {}),
    });

    const markdown = result.markdown ?? "";
    const links = result.links ?? [];

    console.log("title:", result.metadata?.title);
    console.log("markdown length:", markdown.length);
    console.log("link count:", links.length);

    // With the filter off a page can be tens of thousands of characters of
    // navigation. grep shows only the lines that matter for a link pattern.
    if (args.showLinks) {
      const shown = args.grep
        ? links.filter((l) => l.includes(args.grep!))
        : links;
      console.log(`--- ${shown.length} links ---`);
      console.log(shown.slice(0, 60).join("\n").slice(0, args.chars ?? 2500));
    } else if (args.grep) {
      const hits = markdown
        .split("\n")
        .filter((line) => line.toLowerCase().includes(args.grep!.toLowerCase()));
      console.log(`--- ${hits.length} lines matching "${args.grep}" ---`);
      console.log(hits.slice(0, 40).join("\n").slice(0, args.chars ?? 2500));
    } else {
      console.log("--- markdown ---");
      console.log(markdown.slice(0, args.chars ?? 2500));
    }

    return { title: result.metadata?.title, length: markdown.length, links: links.length };
  },
});
