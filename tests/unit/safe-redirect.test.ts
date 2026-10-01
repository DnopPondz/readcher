import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/library", "/library"],
    ["/documents/abc?tab=lessons", "/documents/abc?tab=lessons"],
    ["/documents/%E0%B8%9A%E0%B8%97", "/documents/%E0%B8%9A%E0%B8%97"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example.com",
    "//evil.example.com",
    "/\\evil.example.com",
    "\\\\evil.example.com",
    "javascript:alert(1)",
    "library",
    "",
  ])("rejects %s", (input) => {
    expect(safeRedirectPath(input)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("rejects non-string values", () => {
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeRedirectPath(["/a", "/b"])).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeRedirectPath(null, "/x")).toBe("/x");
  });
});
