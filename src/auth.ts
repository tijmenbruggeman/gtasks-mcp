import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/**
 * Static bearer token gate.
 *
 * Digests both sides before comparing so the comparison is constant-time and
 * leaks neither the token's bytes nor its length.
 */
export function createBearerGate(token: string) {
  const expected = sha256(`Bearer ${token}`);

  return function authorized(request: Request): boolean {
    return timingSafeEqual(sha256(request.headers.get("authorization") ?? ""), expected);
  };
}

/**
 * Deliberately a bare 403 with no `WWW-Authenticate` challenge.
 *
 * A 401 carrying `WWW-Authenticate: Bearer` advertises OAuth 2.0 (RFC 6750),
 * so clients probing this endpoint try to start an OAuth flow that does not
 * exist here. This server takes a static token supplied out of band.
 */
export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "forbidden" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}
