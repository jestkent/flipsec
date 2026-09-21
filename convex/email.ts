import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { unsubscribeToken } from "./http";

// The AgentMail SDK dynamically imports @x402/fetch, a payments module this
// app does not use, and that import cannot be bundled by Convex. The REST API
// is two endpoints, so it is called directly. Plain fetch also means this file
// runs in Convex's default runtime rather than needing "use node".
const API = "https://api.agentmail.to/v0";

// The inbox the daily drill is sent from, and that replies come back to.
// Set with: npx convex env set AGENTMAIL_INBOX_ID drills@yourdomain.agentmail.to
function inboxId(): string {
  const id = process.env.AGENTMAIL_INBOX_ID;
  if (!id) throw new Error("AGENTMAIL_INBOX_ID is not set in Convex env vars");
  return id;
}

async function sendMessage(to: string, subject: string, text: string) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not set in Convex env vars");

  const response = await fetch(
    `${API}/inboxes/${encodeURIComponent(inboxId())}/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, subject, text }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `AgentMail send failed: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as { message_id?: string };
}

function drillSection(drill: {
  prompt: string;
  choices: string[];
  source: string;
  url: string;
}): string {
  const options = drill.choices
    .map((c, i) => `${String.fromCharCode(65 + i)}. ${c}`)
    .join("\n");

  return `Today's drill.

${drill.prompt}

${options}

Just hit reply and tell me which one, in your own words. I will tell you how you did.

This one came from ${drill.source}:
${drill.url}`;
}

type Card = {
  title: string;
  summary: string;
  url: string;
  source: string;
  company?: string;
  locationChip?: string;
  firstStep?: string;
  timeCommitment?: string;
};

function courseSection(card: Card): string {
  const time = card.timeCommitment ? ` Takes ${card.timeCommitment}.` : "";
  const start = card.firstStep ? `\n\nHow to start: ${card.firstStep}${time}` : "";

  return `A free course worth a look.

${card.title}
${card.summary}${start}

${card.url}`;
}

function jobSection(card: Card): string {
  const where = [card.company, card.locationChip].filter(Boolean).join(" · ");

  return `A remote AI job that opened up.

${card.title}${where ? `\n${where}` : ""}
${card.summary}

Listed on ${card.source}:
${card.url}`;
}

const SITE = "https://hallowed-nightingale-322.convex.site";

// One email a day per reader, carrying a section per feed they asked for.
// Two feeds do not mean two emails.
//
// The unsubscribe line is not optional decoration. Commercial mail needs a
// working way out, and for a while the only one was a CLI call nobody but the
// author could make.
function dailyEmail(sections: string[], unsubscribeUrl: string): string {
  return `${sections.join("\n\n———\n\n")}

— FlipSec.ai
${SITE}

Don't want these? Unsubscribe: ${unsubscribeUrl}`;
}

export const sendDailyDrill = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number; failed: number }> => {
    // Fetched once for everybody, not once per reader. A list rather than one
    // drill, so each reader can be given something they have not had yet.
    const candidates: Array<{
      drillId: Id<"drills">;
      storyId: Id<"stories">;
      prompt: string;
      choices: string[];
      source: string;
      url: string;
    }> = await ctx.runQuery(internal.subscribers.listDrillCandidates, {});
    const drill = candidates[0] ?? null;
    const course: Card | null = await ctx.runQuery(
      internal.subscribers.pickTodaysCard,
      { kind: "course" },
    );
    const job: Card | null = await ctx.runQuery(
      internal.subscribers.pickTodaysCard,
      { kind: "job" },
    );

    if (drill === null && course === null && job === null) {
      console.warn("nothing available to send");
      return { sent: 0, failed: 0 };
    }

    const subscribers: Array<{
      subscriberId: Id<"subscribers">;
      email: string;
      kinds: string[];
      lastDrillId: Id<"drills"> | null;
    }> = await ctx.runQuery(internal.subscribers.listActive, {});

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      // The newest drill this reader did not already get. Falls back to the
      // newest when there is only one, which is better than sending nothing.
      const mine =
        candidates.find((c) => c.drillId !== subscriber.lastDrillId) ?? drill;

      // Sections in feed order, and only the feeds this reader asked for.
      const wants = subscriber.kinds;
      const sections: string[] = [];
      if (wants.includes("scam") && mine !== null) {
        sections.push(drillSection(mine));
      }
      if (wants.includes("course") && course !== null) {
        sections.push(courseSection(course));
      }
      if (wants.includes("job") && job !== null) {
        sections.push(jobSection(job));
      }

      if (sections.length === 0) continue;

      // The drill is the only part anyone can reply to, so it sets the
      // subject when it is there.
      const subject =
        wants.includes("scam") && mine !== null
          ? "Spot the scam — today's drill"
          : "Today from FlipSec.ai";

      try {
        const token = await unsubscribeToken(subscriber.email);
        const unsubscribeUrl = `${SITE}/api/unsubscribe?e=${encodeURIComponent(
          subscriber.email,
        )}&t=${token}`;

        await sendMessage(
          subscriber.email,
          subject,
          dailyEmail(sections, unsubscribeUrl),
        );

        // Only the scam drill is gradeable, so only that records a target.
        // A reply from a courses-only reader finds no drill and saveReply
        // logs and drops it, which is the intended behaviour.
        if (wants.includes("scam") && mine !== null) {
          await ctx.runMutation(internal.subscribers.markSent, {
            subscriberId: subscriber.subscriberId,
            drillId: mine.drillId,
            storyId: mine.storyId,
          });
        }
        sent++;
      } catch (error) {
        failed++;
        console.error(`failed to send to ${subscriber.email}`, error);
      }
    }

    console.log(`daily send: sent ${sent}, failed ${failed}`);
    return { sent, failed };
  },
});

// Sends today's drill to one address on demand, so the loop can be shown
// without waiting for the 7am cron. Records the send against the subscriber
// so the reply has something to be graded against.
//
// internalAction, never action. As a public function this would send mail
// from our inbox to any address a caller named, which is an open relay and
// would burn the sending reputation the daily drill depends on. It is called
// from the CLI only.
export const sendTestDrill = internalAction({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; detail: string }> => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false, detail: "not an email" };

    const drill = await ctx.runQuery(internal.subscribers.pickTodaysDrill, {});
    if (drill === null) return { ok: false, detail: "no drill available" };

    const subscriberId: Id<"subscribers"> = await ctx.runMutation(
      internal.subscribers.ensure,
      { email },
    );

    const token = await unsubscribeToken(email);
    await sendMessage(
      email,
      "Spot the scam — today's drill",
      dailyEmail(
        [drillSection(drill)],
        `${SITE}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${token}`,
      ),
    );

    await ctx.runMutation(internal.subscribers.markSent, {
      subscriberId,
      drillId: drill.drillId,
      storyId: drill.storyId,
    });

    return { ok: true, detail: `sent to ${email}` };
  },
});
