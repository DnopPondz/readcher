import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/request-ip";

describe("clientIp", () => {
  it("prefers X-Real-IP set by the reverse proxy", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.5", "x-forwarded-for": "1.1.1.1" });
    expect(clientIp(headers)).toBe("203.0.113.5");
  });

  it("uses the right-most X-Forwarded-For entry, ignoring spoofed ones", () => {
    const headers = new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.7" });
    expect(clientIp(headers)).toBe("198.51.100.7");
  });

  it("falls back when no header is present", () => {
    expect(clientIp(new Headers())).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": " , " }))).toBe("unknown");
  });
});
