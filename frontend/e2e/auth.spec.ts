import { test, expect } from "@playwright/test";
import { loadE2ECredentials, loginViaUi } from "./helpers/auth";

test.describe("Authentification", () => {
  test("route protégée redirige vers login", async ({ page }) => {
    await page.goto("/play");
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });

  test("connexion puis déconnexion", async ({ page }) => {
    await loginViaUi(page);
    await page.getByRole("button", { name: "Déconnexion" }).click();
    await page.goto("/play");
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });

  test("identifiants e2e disponibles", () => {
    const { username, password } = loadE2ECredentials();
    expect(username.length).toBeGreaterThan(2);
    expect(password.length).toBeGreaterThan(8);
  });
});
