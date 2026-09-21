import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { CRON_JOBS } from "./health";
import { confirmToken, unsubscribeToken } from "./http";
import { feedNames } from "./subscribers";

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

// The other half of double opt-in. Anyone can type any address into the
// sign-up box, so nothing is sent to that address except this one message
// asking whether they actually want it. Until the link is pressed the row
// stays pending and listActive skips it.
//
// Scheduled from the subscribe mutation, so a mutation that throws sends
// nothing at all.
export const sendConfirmation = internalAction({
  args: { email: v.string(), kinds: v.optional(v.array(v.string())) },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const token = await confirmToken(email);
    const url = `${SITE}/api/confirm?e=${encodeURIComponent(email)}&t=${token}`;
    // Names the feeds, so the message says what it is actually asking about
    // rather than being interchangeable with any other confirmation mail.
    const wants = feedNames(args.kinds ?? ["scam"]);

    try {
      await sendMessage(
        email,
        `Confirm your FlipSec.ai email — ${wants}`,
        `Someone asked for the FlipSec.ai daily email to be sent to this address,
covering ${wants}.

If that was you, open this link and press the button:

${url}

One email a day, whichever feeds you picked, in one message rather than one
per feed. Adding another feed later does not need another confirmation.

If it was not you, ignore this message. Nothing will be sent and the address
will not be added.

FlipSec.ai — ${SITE}`,
      );
    } catch (error) {
      // A bad address is the common case here, and it is not an app fault.
      // The row stays pending, which is the safe state: no daily mail goes
      // anywhere that never confirmed.
      console.error("confirmation send failed", error);
    }
    return null;
  },
});

// The reply the daily drill has been promising. "Just hit reply and tell me
// which one, in your own words. I will tell you how you did." — and for a
// long time nothing came back. The grade was produced by the model, written
// to the attempt, and never shown to the person who wrote in.
//
// Plain text and short, because it is read on a phone, often by someone who
// is not certain they did it right. The verdict is a word, never a symbol,
// and a wrong answer is told plainly and then explained, never scolded:
// somebody who gets a scam drill wrong is exactly the reader this is for.
export const sendGrade = internalAction({
  args: {
    to: v.string(),
    correct: v.boolean(),
    feedback: v.string(),
    rightAnswer: v.string(),
    explanation: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const opening = args.correct
      ? "You got it."
      : "Not this time, and that is worth knowing.";

    const answer = args.rightAnswer
      ? `\n\nThe strongest sign was: ${args.rightAnswer}`
      : "";

    try {
      const token = await unsubscribeToken(args.to);
      await sendMessage(
        args.to,
        args.correct ? "You got today's drill right" : "About today's drill",
        `${opening}

${args.feedback}${answer}

${args.explanation}

Getting one wrong here costs nothing, which is the entire point of practising
somewhere it is safe. The next one arrives tomorrow.

— FlipSec.ai
${SITE}

Don't want these? Unsubscribe: ${SITE}/api/unsubscribe?e=${encodeURIComponent(args.to)}&t=${token}`,
      );
    } catch (error) {
      // The grade is already saved, so a failed send loses the message and
      // not the work. Never rethrow: a retry would mail them twice.
      console.error("grade reply send failed", error);
    }
    return null;
  },
});

export const sendDailyDrill = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number; failed: number }> => {
    const startedAt = Date.now();
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
      // Three published feeds and nothing to put in a mail is a real fault,
      // not an empty day: it means the queries behind all three came back
      // empty. Recorded rather than returned quietly, because this path sends
      // no mail and so leaves no other trace.
      await ctx.scheduler.runAfter(0, internal.health.recordRun, {
        job: CRON_JOBS.dailyDrill,
        ok: false,
        detail: "nothing available to send",
        startedAt,
      });
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

    // An empty list is a healthy run — nobody has confirmed yet, and inventing
    // an alert for that would train whoever reads this to ignore it. Sending
    // to nobody while subscribers exist is the fault worth naming.
    await ctx.scheduler.runAfter(0, internal.health.recordRun, {
      job: CRON_JOBS.dailyDrill,
      ok: subscribers.length === 0 || sent > 0,
      detail: `sent ${sent}, failed ${failed}, of ${subscribers.length} active`,
      startedAt,
    });

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
