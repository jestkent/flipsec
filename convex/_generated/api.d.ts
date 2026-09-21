/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assistant from "../assistant.js";
import type * as assistantData from "../assistantData.js";
import type * as assistantMessages from "../assistantMessages.js";
import type * as attempts from "../attempts.js";
import type * as courses from "../courses.js";
import type * as crawl from "../crawl.js";
import type * as crons from "../crons.js";
import type * as drills from "../drills.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as languages from "../languages.js";
import type * as lessons from "../lessons.js";
import type * as localization from "../localization.js";
import type * as localizationData from "../localizationData.js";
import type * as probe from "../probe.js";
import type * as questions from "../questions.js";
import type * as stories from "../stories.js";
import type * as subscribers from "../subscribers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assistant: typeof assistant;
  assistantData: typeof assistantData;
  assistantMessages: typeof assistantMessages;
  attempts: typeof attempts;
  courses: typeof courses;
  crawl: typeof crawl;
  crons: typeof crons;
  drills: typeof drills;
  email: typeof email;
  http: typeof http;
  jobs: typeof jobs;
  languages: typeof languages;
  lessons: typeof lessons;
  localization: typeof localization;
  localizationData: typeof localizationData;
  probe: typeof probe;
  questions: typeof questions;
  stories: typeof stories;
  subscribers: typeof subscribers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
