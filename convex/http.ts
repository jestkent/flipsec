import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// AgentMail posts here when a reader replies to the daily drill.
//
// Static hosting owns the root, so this sits under /api. The full URL to
// register with AgentMail is:
//   https://<deployment>.convex.site/api/agentmail-inbound
//
// The handler answers 200 immediately and does the grading in a scheduled
// mutation, because AgentMail's docs say a slow handler will time out.
http.route({
  path: "/agentmail-inbound",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let event: {
      event_type?: string;
      message?: {
        from?: string;
        text?: string;
        html?: string;
        message_id?: string;
      };
    };

    try {
      event = await request.json();
    } catch {
      return new Response("bad json", { status: 400 });
    }

    if (event.event_type !== "message.received") {
      // Not a reply. Acknowledge so AgentMail stops retrying.
      return new Response("ignored", { status: 200 });
    }

    const from = event.message?.from ?? "";
    // text is absent when the sender's client only sent HTML.
    const body = event.message?.text ?? stripHtml(event.message?.html ?? "");

    if (!from || !body.trim()) {
      return new Response("nothing to grade", { status: 200 });
    }

    await ctx.runMutation(internal.attempts.saveReply, {
      from: addressOnly(from),
      body: stripQuoted(body).slice(0, 2000),
    });

    return new Response("ok", { status: 200 });
  }),
});

// "Jess <jess@example.com>" -> "jess@example.com"
function addressOnly(from: string): string {
  const angled = from.match(/<([^>]+)>/);
  return (angled ? angled[1] : from).trim().toLowerCase();
}

// Mail clients append the whole message being replied to. Keeping it would
// store the drill back on the attempt and bill for those tokens on every
// grade, so everything from the first quote marker is dropped.
const QUOTE_MARKERS = [
  // Gmail's "On <date> <sender> wrote:" wraps across lines, so this spans them.
  /^[ \t]*On\s[\s\S]{10,300}?wrote:/m,
  /^[ \t]*-{2,}\s*Original Message\s*-{2,}/im,
  /^_{10,}/m,
  /^[ \t]*From:\s.+$/im,
  /^[ \t]*Sent from my /im,
];

function stripQuoted(body: string): string {
  let cut = body.length;

  for (const marker of QUOTE_MARKERS) {
    const found = body.search(marker);
    if (found !== -1 && found < cut) cut = found;
  }

  const kept = body
    .slice(0, cut)
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n")
    .trim();

  // If stripping ate the whole reply, the markers misfired. Keep the original.
  return kept.length > 0 ? kept : body.trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default http;
