/**
 * Mints a long-lived Google refresh token for the container to use.
 *
 * Run locally (it needs a browser); paste the printed value into the NAS env
 * file as GOOGLE_REFRESH_TOKEN. Reads the client from GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET, falling back to ./gcp-oauth.keys.json.
 */
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/tasks"];
const PORT = 4711;

function loadClient(): { id: string; secret: string } {
  const id = Deno.env.get("GOOGLE_CLIENT_ID");
  const secret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (id && secret) return { id, secret };

  try {
    const keys = JSON.parse(Deno.readTextFileSync("gcp-oauth.keys.json"));
    const installed = keys.installed ?? keys.web;
    return { id: installed.client_id, secret: installed.client_secret };
  } catch {
    throw new Error(
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or place gcp-oauth.keys.json here.",
    );
  }
}

const { id, secret } = loadClient();
const auth = new google.auth.OAuth2(id, secret, `http://localhost:${PORT}`);

const url = auth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force a refresh token even on re-auth
  scope: SCOPES,
});

console.log(`\nOpen this URL to authorize:\n\n${url}\n`);

const code = await new Promise<string>((resolve, reject) => {
  const server = Deno.serve({ port: PORT, onListen: () => {} }, (request) => {
    const code = new URL(request.url).searchParams.get("code");
    if (!code) return new Response("Missing ?code", { status: 400 });
    queueMicrotask(() => {
      server.shutdown().then(() => resolve(code), reject);
    });
    return new Response("Authorized. You can close this tab.", {
      headers: { "content-type": "text/plain" },
    });
  });
});

const { tokens } = await auth.getToken(code);

if (!tokens.refresh_token) {
  console.error("\nNo refresh token returned. Revoke the app's access and retry.");
  Deno.exit(1);
}

console.log(`\nGOOGLE_CLIENT_ID=${id}`);
console.log(`GOOGLE_CLIENT_SECRET=${secret}`);
console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
