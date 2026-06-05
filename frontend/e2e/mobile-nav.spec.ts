import { test, expect } from "@playwright/test";

test.describe("Navigation mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("menu hamburger expose les liens principaux", async ({ page }) => {
    await page.goto("/");
    const menuBtn = page.getByRole("button", { name: /ouvrir le menu/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.getByRole("link", { name: /jouer|play/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /problèmes|puzzles/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /amis|friends/i })).toBeVisible();
  });
});
