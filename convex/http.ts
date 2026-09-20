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
      body: body.slice(0, 2000),
    });

    return new Response("ok", { status: 200 });
  }),
});

// "Jess <jess@example.com>" -> "jess@example.com"
function addressOnly(from: string): string {
  const angled = from.match(/<([^>]+)>/);
  return (angled ? angled[1] : from).trim().toLowerCase();
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
