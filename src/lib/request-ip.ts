/**
 * Best-effort client IP for rate limiting.
 *
 * Expects the reverse proxy (nginx/Plesk) to set `X-Real-IP` to `$remote_addr`.
 * Falls back to the right-most `X-Forwarded-For` entry, which is the one added
 * by our own proxy; left-most entries are client-controlled and can be spoofed.
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts.at(-1);
    if (last) return last;
  }

  return "unknown";
}
