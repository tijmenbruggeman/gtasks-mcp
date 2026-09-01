import type { CallToolResult } from "@modelcontextprotocol/server";
import type { tasks_v1 } from "googleapis";

const MAX_TASK_RESULTS = 100;

/**
 * Normalize a due date string to RFC 3339 format expected by Google Tasks API.
 * Google Tasks only stores the date portion, so time is set to midnight UTC.
 * Accepts: "2025-03-19", "2025-03-19T21:00:00", "2025-03-19T21:00:00Z", etc.
 */
export function normalizeDueDate(due: string | undefined): string | undefined {
  if (!due) return undefined;
  const parsed = new Date(due);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid due date format: "${due}". Use YYYY-MM-DD or ISO 8601 format.`);
  }
  // Google Tasks only uses the date portion, so normalize to midnight UTC
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

const text = (body: string): CallToolResult => ({
  content: [{ type: "text", text: body }],
  isError: false,
});

export class TaskResources {
  static async read(taskId: string, tasks: tasks_v1.Tasks) {
    const taskListsResponse = await tasks.tasklists.list({
      maxResults: MAX_TASK_RESULTS,
    });

    const taskLists = taskListsResponse.data.items || [];
    let task: tasks_v1.Schema$Task | null = null;

    for (const taskList of taskLists) {
      if (taskList.id) {
        try {
          const taskResponse = await tasks.tasks.get({
            tasklist: taskList.id,
            task: taskId,
          });
          task = taskResponse.data;
          break;
        } catch {
          // Task not found in this list, continue to the next one
        }
      }
    }

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  }

  static async list(
    cursor: string | undefined,
    tasks: tasks_v1.Tasks,
  ): Promise<[tasks_v1.Schema$Task[], string | null]> {
    const params: tasks_v1.Params$Resource$Tasks$List = { maxResults: 10 };
    if (cursor) {
      params.pageToken = cursor;
    }

    const taskListsResponse = await tasks.tasklists.list({
      maxResults: MAX_TASK_RESULTS,
    });

    const taskLists = taskListsResponse.data.items || [];

    let allTasks: tasks_v1.Schema$Task[] = [];
    let nextPageToken: string | null = null;

    for (const taskList of taskLists) {
      const tasksResponse = await tasks.tasks.list({
        tasklist: taskList.id ?? undefined,
        ...params,
      });

      allTasks = allTasks.concat(tasksResponse.data.items || []);

      if (tasksResponse.data.nextPageToken) {
        nextPageToken = tasksResponse.data.nextPageToken;
      }
    }

    return [allTasks, nextPageToken];
  }
}

export class TaskActions {
  private static formatTask(task: tasks_v1.Schema$Task) {
    return `${task.title}\n (Due: ${task.due || "Not set"}) - Notes: ${task.notes} - ID: ${task.id} - Status: ${task.status} - URI: ${task.selfLink} - Hidden: ${task.hidden} - Parent: ${task.parent} - Deleted?: ${task.deleted} - Completed Date: ${task.completed} - Position: ${task.position} - Updated Date: ${task.updated} - ETag: ${task.etag} - Links: ${task.links} - Kind: ${task.kind}}`;
  }

  private static formatTaskList(taskList: tasks_v1.Schema$Task[]) {
    return taskList.map((task) => this.formatTask(task)).join("\n");
  }

  private static async _list(tasks: tasks_v1.Tasks) {
    const taskListsResponse = await tasks.tasklists.list({
      maxResults: MAX_TASK_RESULTS,
    });

    const taskLists = taskListsResponse.data.items || [];
    let allTasks: tasks_v1.Schema$Task[] = [];

    for (const taskList of taskLists) {
      if (taskList.id) {
        try {
          const tasksResponse = await tasks.tasks.list({
            tasklist: taskList.id,
            maxResults: MAX_TASK_RESULTS,
          });

          allTasks = allTasks.concat(tasksResponse.data.items || []);
        } catch (error) {
          console.error(`Error fetching tasks for list ${taskList.id}:`, error);
        }
      }
    }
    return allTasks;
  }

  static async create(
    args: { taskListId?: string; title: string; notes?: string; due?: string },
    tasks: tasks_v1.Tasks,
  ): Promise<CallToolResult> {
    if (!args.title) {
      throw new Error("Task title is required");
    }

    const task: tasks_v1.Schema$Task = { title: args.title };
    if (args.notes) task.notes = args.notes;
    if (args.due) task.due = normalizeDueDate(args.due);

    const taskResponse = await tasks.tasks.insert({
      tasklist: args.taskListId || "@default",
      requestBody: task,
    });

    return text(`Task created: ${taskResponse.data.title}`);
  }

  static async update(
    args: {
      taskListId?: string;
      id: string;
      uri?: string;
      title?: string;
      notes?: string;
      status?: string;
      due?: string;
    },
    tasks: tasks_v1.Tasks,
  ): Promise<CallToolResult> {
    if (!args.id) {
      throw new Error("Task ID is required");
    }

    const task: tasks_v1.Schema$Task = { id: args.id };
    if (args.title) task.title = args.title;
    if (args.notes) task.notes = args.notes;
    if (args.status) task.status = args.status;
    if (args.due) task.due = normalizeDueDate(args.due);

    const taskResponse = await tasks.tasks.patch({
      tasklist: args.taskListId || "@default",
      task: args.id,
      requestBody: task,
    });

    return text(`Task updated: ${taskResponse.data.title}`);
  }

  static async list(tasks: tasks_v1.Tasks): Promise<CallToolResult> {
    const allTasks = await this._list(tasks);
    return text(`Found ${allTasks.length} tasks:\n${this.formatTaskList(allTasks)}`);
  }

  static async listTaskLists(tasks: tasks_v1.Tasks): Promise<CallToolResult> {
    const response = await tasks.tasklists.list({ maxResults: MAX_TASK_RESULTS });
    const taskLists = response.data.items || [];

    if (taskLists.length === 0) {
      return text("No task lists found");
    }

    const formatted = taskLists.map((list) => `${list.title} (ID: ${list.id})`).join("\n");
    return text(`Found ${taskLists.length} task lists:\n${formatted}`);
  }

  static async delete(
    args: { taskListId: string; id: string },
    tasks: tasks_v1.Tasks,
  ): Promise<CallToolResult> {
    if (!args.id) {
      throw new Error("Task ID is required");
    }

    await tasks.tasks.delete({
      tasklist: args.taskListId || "@default",
      task: args.id,
    });

    return text(`Task ${args.id} deleted`);
  }

  static async search(query: string, tasks: tasks_v1.Tasks): Promise<CallToolResult> {
    const allTasks = await this._list(tasks);
    const needle = query.toLowerCase();
    const matches = allTasks.filter(
      (task) =>
        task.title?.toLowerCase().includes(needle) || task.notes?.toLowerCase().includes(needle),
    );

    return text(`Found ${matches.length} tasks:\n${this.formatTaskList(matches)}`);
  }

  static async clear(
    args: { taskListId: string },
    tasks: tasks_v1.Tasks,
  ): Promise<CallToolResult> {
    await tasks.tasks.clear({ tasklist: args.taskListId || "@default" });
    return text(`Tasks from tasklist ${args.taskListId} cleared`);
  }
}
