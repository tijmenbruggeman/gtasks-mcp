import { google, type tasks_v1 } from "googleapis";
import { requireEnv } from "./env.ts";

/**
 * Builds a Google Tasks client authenticated with a long-lived refresh token.
 *
 * The OAuth client caches access tokens in memory and refreshes them as they
 * expire, so this must be created once per process — never per request.
 */
export function createTasksClient(): tasks_v1.Tasks {
  const auth = new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
  );
  auth.setCredentials({
    refresh_token: requireEnv(
      "GOOGLE_REFRESH_TOKEN",
      "Run 'deno task auth' locally to mint one.",
    ),
  });
  return google.tasks({ version: "v1", auth });
}
