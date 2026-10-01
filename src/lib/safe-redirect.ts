export const DEFAULT_AFTER_LOGIN = "/library";

const BASE = "http://internal.invalid";

/** Accept only same-origin relative paths to prevent open redirects. */
export function safeRedirectPath(value: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("\\")) return fallback;
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
