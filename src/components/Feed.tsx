import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Post from "./Post";
import Subscribe from "./Subscribe";

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
const EMPTY: Record<string, string> = {
  scam: "The next batch of alerts lands within six hours. Check back then.",
  course: "New free AI courses land here as they are published. Check back soon.",
  job: "New remote AI jobs land here as they are posted. Check back soon.",
};

export default function Feed({ kind = "scam" }: { kind?: string }) {
  // Live. The sync engine reruns this and pushes to every open client the
  // moment a crawl publishes a new story. No polling, no refresh.
  const stories = useQuery(api.stories.listPublished, { kind });
  const userId = readerId();

  if (stories === undefined) {
    return (
      <p className="py-20 text-center text-base text-neutral-500">Loading…</p>
    );
  }

  if (stories.length === 0) {
    return (
      <p className="py-20 text-center text-base text-neutral-600">
        {EMPTY[kind] ?? EMPTY.scam}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Subscribe userId={userId} kind={kind} />
      {stories.map((story) => (
        <Post key={story._id} story={story} userId={userId} />
      ))}
    </div>
  );
}
