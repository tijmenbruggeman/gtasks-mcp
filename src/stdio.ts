import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createTasksClient } from "./google.ts";
import { createServer } from "./mcp.ts";

const tasks = createTasksClient();

serveStdio(() => createServer(tasks));
