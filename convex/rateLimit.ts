import type { MutationCtx } from "./_generated/server";

// One place for every hourly cap that protects a paid model call.
//
// These used to live in three files and each one counted EVERY row in
// toolChecks, whatever wrote it. Because the table is shared, the counts
// were not independent: 210 legitimate translations took Ask FlipSec
// offline for every visitor, since reserveChat's ceiling of 160 was reached
// by rows it had nothing to do with. The per-reader caps had the same fault
// and were worse in practice — one reader switching language spent their
// own Ask FlipSec budget on translations they never asked to pay for.
//
// A budget now counts only the kinds that belong to it, through indexes that
// carry `kind`. Ask FlipSec, Read aloud and translation cannot starve each
// other, and the numbers below mean what they say.

const HOUR = 60 * 60 * 1000;

// `chat` and `image` are one feature, so they share one budget. Nothing else
// does, but the shape allows for it rather than assuming one kind per budget.
export const BUDGETS = {
  chat: { kinds: ["chat", "image"], perReader: 10, global: 160 },
  speech: { kinds: ["speech"], perReader: 20, global: 300 },
  translate: { kinds: ["translate"], perReader: 30, global: 300 },
  // Sign-ups cost an outbound email and name a third party's address, so this
  // is deliberately the tightest budget in the table.
  subscribe: { kinds: ["subscribe"], perReader: 3, global: 60 },
  // Answering a drill costs no model call, so this is about unbounded row
  // insertion rather than money. One attempt per reader per drill is already
  // deduped, so growing the table means inventing reader ids, which only a
  // deployment-wide cap can stop. Set well above anything a person does: six
  // published drills means a real reader writes six rows, ever.
  answer: { kinds: ["answer"], perReader: 60, global: 600 },
} as const;

export type BudgetName = keyof typeof BUDGETS;
export type CheckKind =
  | "message"
  | "image"
  | "chat"
  | "speech"
  | "translate"
  | "subscribe"
  | "answer";

// userId comes from the browser and can be regenerated, so the per-reader cap
// is a courtesy. The global cap is the one an attacker cannot get around, and
// it is why both exist.
export function validReaderId(userId: string): boolean {
  return userId.length >= 1 && userId.length <= 100;
}

// Counts rows of the given kinds, stopping as soon as the ceiling is reached.
// `take(ceiling)` per kind bounds the read: the answer only has to be right
// about whether the ceiling was met, never about the exact total beyond it.
async function countRecent(
  ctx: MutationCtx,
  kinds: readonly string[],
  since: number,
  ceiling: number,
  userId?: string,
): Promise<number> {
  let total = 0;
  for (const kind of kinds) {
    const rows = userId === undefined
      ? await ctx.db
          .query("toolChecks")
          .withIndex("by_kind_time", (q) => q.eq("kind", kind as CheckKind).gt("createdAt", since))
          .take(ceiling)
      : await ctx.db
          .query("toolChecks")
          .withIndex("by_user_kind_time", (q) =>
            q.eq("userId", userId).eq("kind", kind as CheckKind).gt("createdAt", since),
          )
          .take(ceiling);
    total += rows.length;
    if (total >= ceiling) return total;
  }
  return total;
}

// Counts and inserts in ONE mutation, which is the whole point. Check-then-act
// is not a limit on a public endpoint: the model call used to sit between
// counting and writing, and twelve concurrent requests against a cap of ten
// all passed.
//
// Call this only when the work is actually going to cost something. A cache
// hit must not reserve, or a reader browsing already-paid-for rows spends
// their budget on nothing.
export async function reserveSlot(
  ctx: MutationCtx,
  budgetName: BudgetName,
  userId: string,
  kind: CheckKind,
): Promise<boolean> {
  if (!validReaderId(userId)) return false;

  const budget = BUDGETS[budgetName];
  const since = Date.now() - HOUR;

  const mine = await countRecent(ctx, budget.kinds, since, budget.perReader, userId);
  if (mine >= budget.perReader) return false;

  const everyone = await countRecent(ctx, budget.kinds, since, budget.global);
  if (everyone >= budget.global) return false;

  await ctx.db.insert("toolChecks", { userId, kind, createdAt: Date.now() });
  return true;
}
