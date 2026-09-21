import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Post from "./Post";
import Subscribe from "./Subscribe";
import { CardSkeleton, EmptyState } from "./ui";

// No accounts yet. PLAN.md section 15 keeps accounts out of the MVP, so a
// reader is a random id kept in this browser.
//
// Every storage call is wrapped. In a private window, with site data blocked,
// or inside a restricted iframe, reading localStorage throws, and an
// unguarded throw here would render the whole feed as a blank page. A reader
// who cannot be remembered still gets to read and answer, they just start
// fresh next visit.
const KEY = "flipsec:reader";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // randomUUID needs a secure context. This id only has to be unique
    // enough to keep one reader's answers apart from another's.
    return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

let cachedId: string | undefined;

function readerId(): string {
  if (cachedId !== undefined) return cachedId;

  try {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) {
      cachedId = stored;
      return cachedId;
    }
  } catch {
    // Storage is unavailable. Fall through to an id for this session only.
  }

  cachedId = newId();
  try {
    localStorage.setItem(KEY, cachedId);
  } catch {
    // Nothing to do. The id lives in memory for as long as the tab is open.
  }
  return cachedId;
}

// An empty tab says what is coming, never that there is nothing here.
const EMPTY: Record<string, { title: string; body: string }> = {
  scam: {
    title: "No stories yet today",
    body: "The crawler checks the sources every six hours. The next batch lands within six hours, and new cards appear here without you refreshing.",
  },
  course: {
    title: "No guides yet",
    body: "New free guides to AI security appear here as they are published. Nothing has come in since the last crawl.",
  },
  job: {
    title: "No openings yet",
    body: "New roles where AI and security genuinely meet appear here as they are posted. Most listings do not qualify, so this feed stays short on purpose.",
  },
};

export default function Feed({ kind = "scam" }: { kind?: string }) {
  // Live. The sync engine reruns this and pushes to every open client the
  // moment a crawl publishes a new story. No polling, no refresh.
  const stories = useQuery(api.stories.listPublished, { kind });
  const userId = readerId();

  // undefined means the subscription has not resolved yet. Three card shapes
  // rather than the word "Loading", so the page does not jump when the real
  // cards arrive.
  if (stories === undefined) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading the feed</span>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const empty = EMPTY[kind] ?? EMPTY.scam;

  if (stories.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <Subscribe userId={userId} kind={kind} />
        <EmptyState title={empty.title} body={empty.body} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Subscribe userId={userId} kind={kind} />
      {stories.map((story) => (
        <Post key={story._id} story={story} userId={userId} />
      ))}
      <p className="pt-2 text-center text-sm text-slate">
        That is everything in this feed. A card only gets here if it passes
        every gate, so the feeds stay short on purpose.
      </p>
    </div>
  );
}
