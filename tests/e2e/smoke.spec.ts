import { expect, test } from "@playwright/test";

// These checks do not need PostgreSQL or Redis. Full register/login flows
// live in auth.spec.ts and require `docker compose up -d`.

test("home page renders in Thai with security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("เปลี่ยนเอกสารให้เป็นบทเรียน");

  const headers = response?.headers() ?? {};
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+'/);
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("scripts run under the nonce CSP", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
      violations.push(msg.text());
    }
  });
  await page.goto("/login");
  // The form is a client component; hydration proves the framework scripts loaded.
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeEnabled();
  expect(violations).toEqual([]);
});

test("protected pages redirect to login with a callback URL", async ({ page }) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Flibrary$/);
  await expect(page.getByLabel("อีเมล")).toBeVisible();
});

test("API responses carry a restrictive CSP", async ({ request }) => {
  const response = await request.get("/api/auth/csrf");
  expect(response.headers()["content-security-policy"]).toBe(
    "default-src 'none'; frame-ancestors 'none'",
  );
});
