import { Fragment } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { readerId } from "../reader";
import Post from "./Post";
import Subscribe from "./Subscribe";
import { CardSkeleton, EmptyState } from "./ui";

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

export default function Feed({ kind = "scam", storyId }: { kind?: string; storyId?: string }) {
  // Live. The sync engine reruns this and pushes to every open client the
  // moment a crawl publishes a new story. No polling, no refresh.
  const feed = useQuery(api.stories.listPublished, storyId ? "skip" : { kind });
  const single = useQuery(api.stories.publishedStory, storyId ? { storyId } : "skip");
  const stories = storyId ? (single === undefined ? undefined : single ? [single] : []) : feed;
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
    if (storyId) return <div lang="en"><EmptyState title="This card is unavailable" body="It may have been removed. Choose a feed above to keep reading." /></div>;
    return (
      <div className="flex flex-col gap-5">
        <Subscribe userId={userId} kind={kind} />
        <EmptyState title={empty.title} body={empty.body} />
      </div>
    );
  }

  // The sign-up box used to sit ABOVE the first card, so a reader who came to
  // read a feed met an email capture before a single story. That is the
  // pattern people have been trained to distrust, and on an app about not
  // being manipulated it was the wrong first impression. It now appears after
  // the third card, once the feed has shown what it is actually offering, and
  // it is skipped entirely on a single-card permalink where there is no feed
  // to earn it.
  const AFTER = 3;
  return (
    <div className="flex flex-col gap-5">
      {stories.map((story, index) => (
        <Fragment key={story._id}>
          <Post story={story} userId={userId} />
          {!storyId && index === AFTER - 1 && <Subscribe userId={userId} kind={kind} />}
        </Fragment>
      ))}
      {/* A feed shorter than the cut-off still gets one, at the end. */}
      {!storyId && stories.length < AFTER && <Subscribe userId={userId} kind={kind} />}
      {!storyId && <p className="pt-2 text-center text-base text-slate">
        That is everything in this feed. A card only gets here if it passes
        every gate, so the feeds stay short on purpose.
      </p>}
    </div>
  );
}
