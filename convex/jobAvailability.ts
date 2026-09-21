import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import schema from "./schema";

export const page = internalQuery({
  args: { source: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("stories")),
  handler: (ctx, args) => ctx.db.query("stories")
    .withIndex("by_kind_source", (q) => q.eq("kind", "job").eq("source", args.source))
    .paginate(args.paginationOpts),
});

export const reconcile = internalMutation({
  args: {
    source: v.string(), checkedAt: v.number(),
    jobs: v.array(v.object({ id: v.id("stories"), open: v.boolean() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.jobs.length > 50) throw new Error("Availability batches are limited to 50.");
    for (const job of args.jobs) {
      const row = await ctx.db.get(job.id);
      if (!row || row.kind !== "job" || row.source !== args.source ||
          !["published", "closed"].includes(row.status) ||
          row.crawledAt > args.checkedAt || (row.jobCheckedAt ?? 0) > args.checkedAt) continue;
      await ctx.db.patch(row._id, {
        status: job.open ? "published" : "closed", jobCheckedAt: args.checkedAt,
      });
    }
    return null;
  },
});
