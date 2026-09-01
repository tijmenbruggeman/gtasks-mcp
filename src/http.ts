import { createMcpHandler } from "@modelcontextprotocol/server";
import { createBearerGate, unauthorized } from "./auth.ts";
import { requireEnv } from "./env.ts";
import { createTasksClient } from "./google.ts";
import { createServer } from "./mcp.ts";

// Module scope: built once and closed over by every request.
const tasks = createTasksClient();
const authorized = createBearerGate(
  requireEnv("MCP_TOKEN", "Generate one with: openssl rand -base64 32"),
);

const handler = createMcpHandler(() => createServer(tasks), {
  // Never stream: these tools emit no progress notifications, and a plain JSON
  // response avoids long-lived connections through the tunnel.
  responseMode: "json",
  onerror: (error) => console.error("[mcp]", error.message),
});

export default {
  fetch(request: Request): Promise<Response> | Response {
    const { pathname } = new URL(request.url);

    // Unauthenticated so container health checks work; reveals nothing.
    if (pathname.endsWith("/health")) {
      return new Response("ok\n", { headers: { "content-type": "text/plain" } });
    }

    // OAuth discovery must never answer 401 — that tells a client to
    // authenticate before it can learn how to authenticate, and connector
    // probes read it as a broken OAuth server rather than as "no OAuth".
    // 404 is the honest answer: this server takes a static bearer token.
    if (pathname.includes("/.well-known/")) {
      return new Response("not found\n", { status: 404 });
    }

    if (!authorized(request)) return unauthorized();

    return handler.fetch(request);
  },
};
