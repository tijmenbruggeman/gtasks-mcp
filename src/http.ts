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
    // Unauthenticated so container health checks work; reveals nothing.
    if (new URL(request.url).pathname.endsWith("/health")) {
      return new Response("ok\n", { headers: { "content-type": "text/plain" } });
    }

    if (!authorized(request)) return unauthorized();

    return handler.fetch(request);
  },
};
