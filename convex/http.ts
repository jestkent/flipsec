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

// A separate token for confirming, so an unsubscribe link can never confirm
// and a confirm link can never unsubscribe. unsubscribeToken above keeps
// signing the bare address exactly as it did, because links in mail that has
// already been delivered have to keep working.
export async function confirmToken(email: string): Promise<string> {
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
    new TextEncoder().encode(`confirm:${email.trim().toLowerCase()}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export { unsubscribeToken };

// The address now has to travel through a hidden form field, so for the first
// time it reaches the HTML these routes build by hand. Nothing here escapes
// anything for us, which is exactly where a reflected XSS lives.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shared shell for the small pages these routes serve. `body` is trusted
// markup written in this file; anything that came from a request passes
// through escapeHtml before it gets near it.
function htmlPage(title: string, body: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title></head>
<body style="margin:0;font:16px/1.6 system-ui,sans-serif;background:#f7f5ef;color:#17212b">
<div style="max-width:32rem;margin:4rem auto;padding:0 1.25rem">
<h1 style="font-size:1.5rem;margin:0 0 .5rem;color:#102a43">${title}</h1>
${body}
<p style="margin-top:1.5rem"><a href="/" style="color:#3e6450">&larr; Back to FlipSec.ai</a></p>
</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function message(title: string, line: string): Response {
  return htmlPage(title, `<p style="color:#52677a;margin:0">${line}</p>`);
}

// A button, not a link that acts on sight. Outlook Safe Links, Proofpoint URL
// Defense and Gmail all fetch links in mail before a human sees them. A GET
// that unsubscribed on sight meant a scanner quietly removed real readers,
// and a GET that confirmed on sight would make double opt-in meaningless,
// because the scanner would be the one consenting.
function actionPage(
  title: string,
  line: string,
  path: string,
  email: string,
  token: string,
  button: string,
): Response {
  return htmlPage(
    title,
    `<p style="color:#52677a;margin:0 0 1.5rem">${line}</p>
<form method="POST" action="${path}">
<input type="hidden" name="e" value="${escapeHtml(email)}">
<input type="hidden" name="t" value="${escapeHtml(token)}">
<button type="submit" style="min-height:44px;padding:0 1.25rem;border:0;border-radius:8px;background:#3e6450;color:#fff;font:600 16px system-ui,sans-serif;cursor:pointer">${button}</button>
</form>`,
  );
}

// The address arrives in the query string on the GET that draws the button,
// and in the posted form on the POST that acts. `kinds` only ever comes from
// the posted form: it is what the reader ticked.
async function readParams(
  request: Request,
): Promise<{ email: string; token: string; kinds: string[] }> {
  if (request.method === "POST") {
    const form = new URLSearchParams(await request.text());
    return {
      email: (form.get("e") ?? "").trim().toLowerCase(),
      token: form.get("t") ?? "",
      kinds: form.getAll("k"),
    };
  }
  const url = new URL(request.url);
  return {
    email: (url.searchParams.get("e") ?? "").trim().toLowerCase(),
    token: url.searchParams.get("t") ?? "",
    kinds: [],
  };
}

// The feeds, as a reader picks them. Signing up from three tabs merges into
// one subscription, and the sign-up box has to guess from whichever tab they
// were on — so the confirm page is where they say what they actually want,
// with the boxes already ticked for what they asked for.
const FEED_CHOICES = [
  { kind: "scam", name: "AI Sec News", line: "A drill from a real AI scam. Reply and it comes back graded." },
  { kind: "course", name: "AI Sec Learn", line: "One free guide, what it teaches, and where to start." },
  { kind: "job", name: "AI Sec Jobs", line: "One opening, what they want, and how to apply." },
];

function choicesPage(email: string, token: string, wanted: string[]): Response {
  const boxes = FEED_CHOICES.map(({ kind, name, line }) => {
    const checked = wanted.includes(kind) ? " checked" : "";
    const id = `feed-${kind}`;
    return `<label for="${id}" style="display:flex;gap:.75rem;align-items:flex-start;min-height:44px;padding:.5rem 0;cursor:pointer">
<input type="checkbox" id="${id}" name="k" value="${kind}"${checked} style="width:20px;height:20px;margin-top:.35rem;flex:none;accent-color:#3e6450">
<span><span style="font-weight:600;color:#102a43">${name}</span><br><span style="color:#52677a">${line}</span></span>
</label>`;
  }).join("\n");

  return htmlPage(
    "Start the daily email?",
    `<p style="color:#52677a;margin:0 0 1rem">Pick what you want. It arrives as one email each morning, not one per feed, and you can stop any time from the link at the foot of every message.</p>
<form method="POST" action="/api/confirm">
<input type="hidden" name="e" value="${escapeHtml(email)}">
<input type="hidden" name="t" value="${escapeHtml(token)}">
<fieldset style="border:0;padding:0;margin:0 0 1.25rem">
<legend style="font-weight:600;color:#102a43;padding:0 0 .25rem">Send me</legend>
${boxes}
</fieldset>
<button type="submit" style="min-height:44px;padding:0 1.25rem;border:0;border-radius:8px;background:#3e6450;color:#fff;font:600 16px system-ui,sans-serif;cursor:pointer">Start the daily email</button>
</form>`,
  );
}

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
const unsubscribeHandler = httpAction(async (ctx, request) => {
  const { email, token } = await readParams(request);
  if (!email || !token) return message("That link is incomplete", "Nothing was changed.");

  if (!secretsMatch(token, await unsubscribeToken(email))) {
    return message("That link is not valid", "Nothing was changed.");
  }

  if (request.method !== "POST") {
    return actionPage(
      "Unsubscribe from FlipSec.ai?",
      "You are about to stop the daily email. Every feed stays readable on the site without signing up.",
      "/api/unsubscribe",
      email,
      token,
      "Unsubscribe",
    );
  }

  await ctx.runMutation(internal.subscribers.deactivate, { email });
  return message(
    "You are unsubscribed",
    "No more daily mail from FlipSec.ai. You can read the feed any time without signing up.",
  );
});

http.route({ path: "/unsubscribe", method: "GET", handler: unsubscribeHandler });
http.route({ path: "/unsubscribe", method: "POST", handler: unsubscribeHandler });

// Double opt-in. The address that will receive the mail is the one that has
// to press the button, which is what makes this consent rather than a
// stranger filling in a form with someone else's address.
const confirmHandler = httpAction(async (ctx, request) => {
  const { email, token, kinds } = await readParams(request);
  if (!email || !token) return message("That link is incomplete", "Nothing was changed.");

  if (!secretsMatch(token, await confirmToken(email))) {
    return message("That link is not valid", "Nothing was changed.");
  }

  const row = await ctx.runQuery(internal.subscribers.pendingFor, { email });
  if (row === null) {
    // A valid signature for an address that is no longer here: the sign-up
    // was removed, or this is an old link from before it was. Saying "you are
    // on the list" would be a lie.
    return message(
      "That sign-up is no longer here",
      "Nothing was changed. You can sign up again from any feed on the site.",
    );
  }

  if (request.method !== "POST") {
    return choicesPage(email, token, row.kinds);
  }

  // Nothing ticked is a real answer, and it means no. Confirming an empty
  // selection would start a daily email carrying nothing.
  if (kinds.length === 0) {
    return message(
      "Nothing was started",
      "No feeds were picked, so no email will be sent. Open the link again if you change your mind.",
    );
  }

  await ctx.runMutation(internal.subscribers.confirm, { email, kinds });
  return message(
    "You are on the list",
    "The first email arrives tomorrow morning, carrying the feeds you picked in one message. Every one of them has an unsubscribe link at the foot.",
  );
});

http.route({ path: "/confirm", method: "GET", handler: confirmHandler });
http.route({ path: "/confirm", method: "POST", handler: confirmHandler });

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
