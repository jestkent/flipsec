import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

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

function drillEmail(drill: {
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
${drill.url}

— FlipSec`;
}

export const sendDailyDrill = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number; failed: number }> => {
    const drill = await ctx.runQuery(internal.subscribers.pickTodaysDrill, {});
    if (drill === null) {
      console.warn("no drill available to send");
      return { sent: 0, failed: 0 };
    }

    const subscribers: Array<{
      subscriberId: Id<"subscribers">;
      email: string;
    }> = await ctx.runQuery(internal.subscribers.listActive, {});

    const text = drillEmail(drill);
    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      try {
        await sendMessage(
          subscriber.email,
          "Spot the scam — today's drill",
          text,
        );

        await ctx.runMutation(internal.subscribers.markSent, {
          subscriberId: subscriber.subscriberId,
          drillId: drill.drillId,
          storyId: drill.storyId,
        });
        sent++;
      } catch (error) {
        failed++;
        console.error(`failed to send to ${subscriber.email}`, error);
      }
    }

    console.log(`daily drill: sent ${sent}, failed ${failed}`);
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

    await sendMessage(
      email,
      "Spot the scam — today's drill",
      drillEmail(drill),
    );

    await ctx.runMutation(internal.subscribers.markSent, {
      subscriberId,
      drillId: drill.drillId,
      storyId: drill.storyId,
    });

    return { ok: true, detail: `sent to ${email}` };
  },
});
