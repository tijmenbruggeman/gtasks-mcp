import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import type { tasks_v1 } from "googleapis";
import * as z from "zod";
import { TaskActions, TaskResources } from "./Tasks.ts";

const VERSION = "0.2.0";

/**
 * Builds the MCP server. Called once per request by the HTTP handler, so it
 * must stay cheap — the authenticated Google client is passed in, not built.
 */
export function createServer(tasks: tasks_v1.Tasks): McpServer {
  const server = new McpServer({ name: "gtasks", version: VERSION });

  server.registerResource(
    "task",
    new ResourceTemplate("gtasks:///{taskId}", {
      list: async () => {
        const [allTasks] = await TaskResources.list(undefined, tasks);
        return {
          resources: allTasks.map((task) => ({
            uri: `gtasks:///${task.id}`,
            mimeType: "text/plain",
            name: task.title ?? "Untitled task",
          })),
        };
      },
    }),
    { title: "Google Task", mimeType: "text/plain" },
    async (uri, { taskId }) => {
      const task = await TaskResources.read(String(taskId), tasks);
      const details = [
        `Title: ${task.title || "No title"}`,
        `Status: ${task.status || "Unknown"}`,
        `Due: ${task.due || "Not set"}`,
        `Notes: ${task.notes || "No notes"}`,
        `Hidden: ${task.hidden || "Unknown"}`,
        `Parent: ${task.parent || "Unknown"}`,
        `Deleted?: ${task.deleted || "Unknown"}`,
        `Completed Date: ${task.completed || "Unknown"}`,
        `Position: ${task.position || "Unknown"}`,
        `ETag: ${task.etag || "Unknown"}`,
        `Links: ${task.links || "Unknown"}`,
        `Kind: ${task.kind || "Unknown"}`,
        `Created: ${task.updated || "Unknown"}`,
        `Updated: ${task.updated || "Unknown"}`,
      ].join("\n");

      return { contents: [{ uri: uri.href, mimeType: "text/plain", text: details }] };
    },
  );

  server.registerTool(
    "search",
    {
      description: "Search for a task in Google Tasks",
      inputSchema: z.object({ query: z.string().describe("Search query") }),
    },
    ({ query }) => TaskActions.search(query, tasks),
  );

  server.registerTool(
    "list",
    { description: "List all tasks in Google Tasks" },
    () => TaskActions.list(tasks),
  );

  server.registerTool(
    "list-tasklists",
    { description: "List all task lists in Google Tasks" },
    () => TaskActions.listTaskLists(tasks),
  );

  server.registerTool(
    "create",
    {
      description: "Create a new task in Google Tasks",
      inputSchema: z.object({
        taskListId: z.string().optional().describe("Task list ID"),
        title: z.string().describe("Task title"),
        notes: z.string().optional().describe("Task notes"),
        due: z.string().optional().describe(
          "Due date (YYYY-MM-DD or ISO 8601 format, e.g. 2025-03-19)",
        ),
      }),
    },
    (args) => TaskActions.create(args, tasks),
  );

  server.registerTool(
    "update",
    {
      description: "Update a task in Google Tasks",
      inputSchema: z.object({
        taskListId: z.string().optional().describe("Task list ID"),
        id: z.string().describe("Task ID"),
        title: z.string().optional().describe("Task title"),
        notes: z.string().optional().describe("Task notes"),
        status: z.enum(["needsAction", "completed"]).optional().describe("Task status"),
        due: z.string().optional().describe(
          "Due date (YYYY-MM-DD or ISO 8601 format, e.g. 2025-03-19)",
        ),
      }),
    },
    (args) => TaskActions.update(args, tasks),
  );

  server.registerTool(
    "delete",
    {
      description: "Delete a task in Google Tasks",
      inputSchema: z.object({
        taskListId: z.string().describe("Task list ID"),
        id: z.string().describe("Task ID"),
      }),
    },
    (args) => TaskActions.delete(args, tasks),
  );

  server.registerTool(
    "clear",
    {
      description: "Clear completed tasks from a Google Tasks task list",
      inputSchema: z.object({ taskListId: z.string().describe("Task list ID") }),
    },
    (args) => TaskActions.clear(args, tasks),
  );

  return server;
}
