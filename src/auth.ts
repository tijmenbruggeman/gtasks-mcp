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

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": 'Bearer realm="mcp"',
    },
  });
}
