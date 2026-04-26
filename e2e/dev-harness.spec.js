import { expect, test } from "@playwright/test";

test("dev harness reports registry checks pass", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Battery Visualiser");

  const results = page.locator("#registry-harness-results");
  await expect(results).toContainText("passed", { timeout: 10000 });
  await expect(results).not.toContainText("failed");
});
