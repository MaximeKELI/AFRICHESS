import { test, expect } from "@playwright/test";

test.describe("Navigation mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("menu drawer exposes grouped links", async ({ page }) => {
    await page.goto("/");
    const menuBtn = page.getByRole("button", { name: /ouvrir le menu|open menu/i }).last();
    await menuBtn.click();
    await expect(page.getByRole("link", { name: /problèmes|puzzles/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /amis|friends/i })).toBeVisible();
  });
});
