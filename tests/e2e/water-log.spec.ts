import { test, expect } from "@playwright/test";

test("user can open dashboard and navigate to logging", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Log Usage" }).click();
  await expect(page.getByRole("heading", { name: "Manual Logging" })).toBeVisible();
});
