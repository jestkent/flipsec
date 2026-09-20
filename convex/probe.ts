"use node";

import FirecrawlApp from "@mendable/firecrawl-js";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Dev-only helper for evaluating a candidate source before wiring it into the
// pipeline. Logs what Firecrawl returns. Writes nothing.
export const probeSource = internalAction({
  args: { url: v.string(), chars: v.optional(v.number()) },
  handler: async (_ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");

    const firecrawl = new FirecrawlApp({ apiKey });
    const result = await firecrawl.scrape(args.url, {
      formats: ["markdown", "links"],
      onlyMainContent: true,
    });

    const markdown = result.markdown ?? "";
    const links = result.links ?? [];

    console.log("title:", result.metadata?.title);
    console.log("markdown length:", markdown.length);
    console.log("link count:", links.length);
    console.log("--- markdown ---");
    console.log(markdown.slice(0, args.chars ?? 2500));

    return { title: result.metadata?.title, length: markdown.length, links: links.length };
  },
});
