const DEFAULT_NEXT = "/juegos";

// Where the auth routes (/auth/confirm, /auth/callback) may send the user after
// signing in. Only internal paths: an absolute URL or a protocol-relative
// "//host" would turn those routes into open redirects.
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_NEXT;
  return next;
}
