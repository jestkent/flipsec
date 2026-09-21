import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Both routes below are open to the internet, so both carry a shared secret.
//
// Timing-safe compare. Cheap, and it costs nothing to not leak the secret one
// character at a time.
function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The unsubscribe link has to be guessable by nobody but derivable by us, so
// it is an HMAC of the address rather than a stored token.
async function unsubscribeToken(email: string): Promise<string> {
  const secret = process.env.WEBHOOK_SECRET ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(email.trim().toLowerCase()),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export { unsubscribeToken };

// AgentMail signs every webhook it sends, the way most providers do: an id, a
// timestamp and an HMAC over "id.timestamp.body", with the signing secret
// issued per webhook and shown on the webhook object as whsec_...
//
// Verifying that signature is strictly better than the shared secret in the
// URL that this route also accepts. It proves the body was not altered as
// well as who sent it, the secret never travels in a URL that could turn up
// in a log, and — the practical part — the webhook already registered with
// AgentMail keeps working untouched, so there is no window where replies
// silently stop because a URL somewhere was not updated.
//
// Header names differ by vendor between the svix- prefix and the webhook-
// prefix of the standard-webhooks spec. Both are read.
function signatureHeaders(request: Request) {
  const get = (name: string) =>
    request.headers.get(`svix-${name}`) ?? request.headers.get(`webhook-${name}`);
  return { id: get("id"), timestamp: get("timestamp"), signature: get("signature") };
}

async function signatureIsValid(
  request: Request,
  body: string,
): Promise<boolean> {
  const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
  if (!secret) return false;

  const { id, timestamp, signature } = signatureHeaders(request);
  if (!id || !timestamp || !signature) return false;

  // Reject anything older than five minutes so a captured delivery cannot be
  // replayed later.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  // The secret is base64 after the whsec_ prefix.
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // The header carries a space-separated list of "v1,<signature>" so a secret
  // can be rotated without dropping deliveries. Any one matching is enough.
  return signature
    .split(" ")
    .map((part) => part.split(",")[1] ?? "")
    .some((candidate) => secretsMatch(candidate, expected));
}

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
    // Anyone could POST here. With no check, a forged "from" naming a real
    // subscriber wrote an attempt for them and spent an OpenAI call grading
    // it — free grade spoofing and a free way to run up the bill.
    //
    // Two ways in, and it fails closed if neither is configured. AgentMail's
    // own signature is the real one. The shared secret in the query string is
    // kept for a manual curl during a demo, and because it costs nothing.
    const rawBody = await request.text();

    const shared = process.env.WEBHOOK_SECRET;
    const supplied =
      new URL(request.url).searchParams.get("k") ??
      request.headers.get("x-flipsec-secret") ??
      "";

    const bySignature = await signatureIsValid(request, rawBody);
    const bySharedSecret =
      shared !== undefined && supplied !== "" && secretsMatch(supplied, shared);

    if (!bySignature && !bySharedSecret) {
      console.warn("inbound webhook rejected: no valid signature or secret");
      return new Response("unauthorized", { status: 401 });
    }

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
      // Already read as text above, because the signature covers the exact
      // bytes and the body can only be consumed once.
      event = JSON.parse(rawBody);
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

// Every commercial email needs a working way out, and the only one that
// existed was a CLI call only the author could make. This is a GET because
// mail clients and scanners follow links, so it confirms rather than acting
// blind — except that a scanner following it should still not silently
// unsubscribe a real reader, which is why the address has to arrive with a
// matching signature.
http.route({
  path: "/unsubscribe",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
    const token = url.searchParams.get("t") ?? "";

    const page = (title: string, line: string) =>
      new Response(
        `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<body style="margin:0;font:16px/1.6 system-ui,sans-serif;background:#fafafa;color:#171717">
<div style="max-width:32rem;margin:4rem auto;padding:0 1.25rem">
<h1 style="font-size:1.5rem;margin:0 0 .5rem">${title}</h1>
<p style="color:#525252;margin:0 0 1.5rem">${line}</p>
<a href="/" style="color:#171717">← Back to FlipSec.ai</a>
</div></body>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );

    if (!email || !token) return page("That link is incomplete", "Nothing was changed.");

    const expected = await unsubscribeToken(email);
    if (!secretsMatch(token, expected)) {
      return page("That link is not valid", "Nothing was changed.");
    }

    await ctx.runMutation(internal.subscribers.deactivate, { email });
    return page(
      "You are unsubscribed",
      "No more daily mail from FlipSec.ai. You can read the feed any time without signing up.",
    );
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
