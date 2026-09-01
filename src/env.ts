export function requireEnv(name: string, hint?: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.${hint ? ` ${hint}` : ""}`);
  }
  return value;
}
