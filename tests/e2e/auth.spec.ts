import { expect, test } from "@playwright/test";

// Needs PostgreSQL and Redis: `docker compose up -d && npx prisma migrate deploy`,
// then run with E2E_WITH_SERVICES=1.
test.skip(!process.env.E2E_WITH_SERVICES, "requires docker compose services");

test("register, log out, and log back in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "รหัสผ่านสำหรับทดสอบ";

  await page.goto("/register");
  await page.getByLabel("ชื่อ (ไม่บังคับ)").fill("ผู้ทดสอบ");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(password);
  await page.getByLabel("ยืนยันรหัสผ่าน").fill(password);
  await page.getByRole("button", { name: "สมัครสมาชิก" }).click();

  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText("สวัสดี ผู้ทดสอบ")).toBeVisible();

  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/library");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);

  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill("wrong password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page.getByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();

  await page.getByLabel("รหัสผ่าน").fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/library$/);
});

test("duplicate email is rejected", async ({ page }) => {
  const email = `dup-${Date.now()}@example.com`;
  const password = "correct horse battery";

  for (let i = 0; i < 2; i++) {
    await page.context().clearCookies();
    await page.goto("/register");
    await page.getByLabel("อีเมล").fill(email);
    await page.getByLabel("รหัสผ่าน", { exact: true }).fill(password);
    await page.getByLabel("ยืนยันรหัสผ่าน").fill(password);
    await page.getByRole("button", { name: "สมัครสมาชิก" }).click();
    if (i === 0) await expect(page).toHaveURL(/\/library$/);
  }
  await expect(page.getByText("อีเมลนี้ถูกใช้สมัครแล้ว")).toBeVisible();
});
