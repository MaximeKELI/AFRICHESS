import { test, expect } from "@playwright/test";
import { loadE2ECredentials, loginViaUi } from "./helpers/auth";

test.describe("Authentification", () => {
  test("profil non connecté affiche le lien connexion", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("link", { name: /connexion|login/i })).toBeVisible();
  });

  test("connexion puis déconnexion", async ({ page }) => {
    await loginViaUi(page);
    await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible();
    await page.getByRole("button", { name: "Déconnexion" }).click();
    // Ne pas enchaîner un goto immédiat : le logout déclenche déjà une navigation.
    await expect(
      page.getByRole("navigation").getByRole("link", { name: /connexion|login/i }),
    ).toBeVisible();
  });

  test("identifiants e2e disponibles", () => {
    const { username, password } = loadE2ECredentials();
    expect(username.length).toBeGreaterThan(2);
    expect(password.length).toBeGreaterThan(8);
  });
});
