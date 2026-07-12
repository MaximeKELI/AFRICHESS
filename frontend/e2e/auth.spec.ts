import { test, expect } from "@playwright/test";
import { loadE2ECredentials, loginViaUi } from "./helpers/auth";

test.describe("Authentification", () => {
  test("profil non connecté affiche le lien connexion", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("link", { name: /connexion|login/i })).toBeVisible();
  });

  test("connexion puis déconnexion", async ({ page }) => {
    await loginViaUi(page);
    await page.getByRole("button", { name: "Déconnexion" }).click();
    // Attendre la fin de la navigation de logout avant un nouveau goto.
    await expect(page.getByRole("link", { name: /connexion|login/i })).toBeVisible();
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /connexion|login/i })).toBeVisible();
  });

  test("identifiants e2e disponibles", () => {
    const { username, password } = loadE2ECredentials();
    expect(username.length).toBeGreaterThan(2);
    expect(password.length).toBeGreaterThan(8);
  });
});
