/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiUsage from "../aiUsage.js";
import type * as boardStars from "../boardStars.js";
import type * as boards from "../boards.js";
import type * as collaboration from "../collaboration.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as invitationEmail from "../invitationEmail.js";
import type * as invitations from "../invitations.js";
import type * as projects from "../projects.js";
import type * as publicShares from "../publicShares.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiUsage: typeof aiUsage;
  boardStars: typeof boardStars;
  boards: typeof boards;
  collaboration: typeof collaboration;
  files: typeof files;
  http: typeof http;
  invitationEmail: typeof invitationEmail;
  invitations: typeof invitations;
  projects: typeof projects;
  publicShares: typeof publicShares;
  templates: typeof templates;
  users: typeof users;
  workspaces: typeof workspaces;
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

export declare const components: {};
