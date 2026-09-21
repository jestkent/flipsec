import { useSyncExternalStore } from "react";
import type { View } from "./components/Header";

export type Route = { view: View; kind: string; storyId?: string; missing?: boolean };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length || (parts.length === 1 && parts[0] === "home")) return { view: "home", kind: "scam" };
  if (["tools", "about", "privacy"].includes(parts[0]) && parts.length === 1) return { view: parts[0] as View, kind: "scam" };
  if (parts[0] === "feed" && ["scam", "course", "job"].includes(parts[1]) &&
    (parts.length === 2 || (parts.length === 4 && parts[2] === "story" && /^[a-zA-Z0-9]+$/.test(parts[3])))) {
    return { view: "feed", kind: parts[1], ...(parts[3] ? { storyId: parts[3] } : {}) };
  }
  return { view: "home", kind: "scam", missing: true };
}

export function routeHash(route: Route): string {
  return route.view === "feed" ? `#/feed/${route.kind}${route.storyId ? `/story/${route.storyId}` : ""}` : `#/${route.view}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => { window.removeEventListener("hashchange", onChange); window.removeEventListener("popstate", onChange); };
}

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, () => window.location.hash, () => ""));
}

export function navigateTo(route: Route) {
  const hash = routeHash(route);
  if (window.location.hash === hash) return;
  window.history.pushState(null, "", hash);
  window.dispatchEvent(new Event("hashchange"));
}
