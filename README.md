# Google Tasks MCP Server

![gtasks mcp logo](./logo.jpg)
[![smithery badge](https://smithery.ai/badge/@zcaceres/gtasks)](https://smithery.ai/server/@zcaceres/gtasks)

This MCP server integrates with Google Tasks to allow listing, reading, searching, creating, updating, and deleting tasks.

## Components

### Tools

- **search**
  - Search for tasks in Google Tasks
  - Input: `query` (string): Search query
  - Returns matching tasks with details

- **list**
  - List all tasks in Google Tasks
  - Optional input: `cursor` (string): Cursor for pagination
  - Returns a list of all tasks

- **create**
  - Create a new task in Google Tasks
  - Input:
    - `taskListId` (string, optional): Task list ID
    - `title` (string, required): Task title
    - `notes` (string, optional): Task notes
    - `due` (string, optional): Due date
  - Returns confirmation of task creation

- **update**
  - Update an existing task in Google Tasks
  - Input:
    - `taskListId` (string, optional): Task list ID
    - `id` (string, required): Task ID
    - `uri` (string, required): Task URI
    - `title` (string, optional): New task title
    - `notes` (string, optional): New task notes
    - `status` (string, optional): New task status ("needsAction" or "completed")
    - `due` (string, optional): New due date
  - Returns confirmation of task update

- **delete**
  - Delete a task in Google Tasks
  - Input:
    - `taskListId` (string, required): Task list ID
    - `id` (string, required): Task ID
  - Returns confirmation of task deletion

- **clear**
  - Clear completed tasks from a Google Tasks task list
  - Input: `taskListId` (string, required): Task list ID
  - Returns confirmation of cleared tasks

### Resources

The server provides access to Google Tasks resources:

- **Tasks** (`gtasks:///<task_id>`)
  - Represents individual tasks in Google Tasks
  - Supports reading task details including title, status, due date, notes, and other metadata
  - Can be listed, read, created, updated, and deleted using the provided tools

## Getting started

Runs on Deno, either as a local stdio server or as a container serving
Streamable HTTP behind a reverse proxy or Cloudflare Tunnel.

### 1. Google Cloud setup

1. [Create a Google Cloud project](https://console.cloud.google.com/projectcreate)
2. [Enable the Google Tasks API](https://console.cloud.google.com/workspace-api/products)
3. [Configure the OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) and add the scope `https://www.googleapis.com/auth/tasks`
4. **Publish the app** (status "In production"). While it sits in "Testing", Google expires refresh tokens after 7 days, which breaks any hosted deployment.
5. [Create an OAuth Client ID](https://console.cloud.google.com/apis/credentials/oauthclient) of type "Desktop App" and save the JSON as `gcp-oauth.keys.json` in this repo

### 2. Mint a refresh token

```bash
deno task auth
```

Opens a consent flow and prints the three values the server needs:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.

### 3. Run it

**Locally over stdio:**

```bash
export GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_REFRESH_TOKEN=...
deno task stdio
```

```json
{
  "mcpServers": {
    "gtasks": {
      "command": "deno",
      "args": ["task", "--cwd", "{ABSOLUTE PATH TO REPO}", "stdio"]
    }
  }
}
```

**As a container over HTTP:**

```bash
docker build -t gtasks-mcp .
docker run -p 8080:8080 \
  -e MCP_TOKEN="$(openssl rand -base64 32)" \
  -e GOOGLE_CLIENT_ID=... -e GOOGLE_CLIENT_SECRET=... -e GOOGLE_REFRESH_TOKEN=... \
  gtasks-mcp
```

Every request must carry `Authorization: Bearer $MCP_TOKEN` — the server holds
your Google credentials, so an unauthenticated endpoint hands anyone your task
list. `GET /health` is the one unauthenticated route.

```bash
claude mcp add -t http gtasks https://your.host/gtasks/mcp -H "Authorization: Bearer $MCP_TOKEN"
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | yes | OAuth client from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | yes | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | yes | Long-lived token from `deno task auth` |
| `MCP_TOKEN` | HTTP only | Shared bearer token callers must present |

### Development

```bash
deno task dev     # watch mode on :8080
deno task check   # type check
deno task test    # unit tests
```
