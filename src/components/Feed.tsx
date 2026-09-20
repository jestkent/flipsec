import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Post from "./Post";
import Subscribe from "./Subscribe";

// No accounts yet. PLAN.md section 15 keeps accounts out of the MVP, so a
// reader is a random id kept in this browser.
function readerId(): string {
  const KEY = "flipsec:reader";
  let id = localStorage.getItem(KEY);
  if (id === null) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export default function Feed() {
  // Live. The sync engine reruns this and pushes to every open client the
  // moment a crawl publishes a new story. No polling, no refresh.
  const stories = useQuery(api.stories.listPublished, {});
  const userId = readerId();

  if (stories === undefined) {
    return (
      <p className="py-20 text-center text-sm text-neutral-400">Loading…</p>
    );
  }

  if (stories.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-neutral-500">
        The next batch of alerts lands within six hours. Check back then.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Subscribe userId={userId} />
      {stories.map((story) => (
        <Post key={story._id} story={story} userId={userId} />
      ))}
    </div>
  );
}
