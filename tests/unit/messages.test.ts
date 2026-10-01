import { describe, expect, it } from "vitest";
import { format, messages } from "@/messages";

describe("format", () => {
  it("fills placeholders and leaves unknown ones intact", () => {
    expect(format(messages.library.greeting, { name: "สมชาย" })).toBe("สวัสดี สมชาย");
    expect(format("{a} {b}", { a: "x" })).toBe("x {b}");
  });
});
