import { expect, test } from "vitest";
import { parseRoute, routeHash } from "./navigation";

test("view, feed and card links survive a URL round trip", () => {
  for (const view of ["home", "tools", "about", "privacy"] as const) {
    expect(parseRoute(routeHash({ view, kind: "scam" }))).toEqual({ view, kind: "scam" });
  }
  for (const kind of ["scam", "course", "job"]) {
    expect(parseRoute(routeHash({ view: "feed", kind, storyId: "abc123" }))).toEqual({ view: "feed", kind, storyId: "abc123" });
  }
});

test("unknown and malformed links have a missing-page state", () => {
  for (const hash of ["#/feed/unknown", "#/feed/scam/story/%ZZ", "#/tools/extra", "#/unknown"]) {
    expect(parseRoute(hash).missing).toBe(true);
  }
  expect(parseRoute("")).toEqual({ view: "home", kind: "scam" });
});
