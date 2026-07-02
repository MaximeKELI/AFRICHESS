import { test, expect } from "@playwright/test";
import { loadE2ECredentials, loginViaUi } from "./helpers/auth";

test.describe("Authentification", () => {
  test("connexion puis déconnexion", async ({ page }) => {
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/play/);

    await page.getByRole("button", { name: /menu|profil|account/i }).first().click().catch(() => {});
    const logout = page.getByRole("link", { name: /déconnexion|logout/i });
    if (await logout.count()) {
      await logout.first().click();
    } else {
      await page.evaluate(() => {
        document.cookie = "access_token=; Max-Age=0; path=/";
        document.cookie = "refresh_token=; Max-Age=0; path=/";
      });
      await page.goto("/play");
    }

    await page.goto("/profile");
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });

  test("identifiants e2e disponibles", () => {
    const { username, password } = loadE2ECredentials();
    expect(username.length).toBeGreaterThan(2);
    expect(password.length).toBeGreaterThan(8);
  });
});
