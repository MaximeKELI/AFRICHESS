import { test, expect } from "@playwright/test";

const username = process.env.E2E_USERNAME || "e2e_player";
const password = process.env.E2E_PASSWORD || "E2eTestPass123!";

test.describe("Parcours joueur", () => {
  test("connexion puis lancement partie IA", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Nom d'utilisateur").fill(username);
    await page.getByPlaceholder("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/play/, { timeout: 30_000 });

    await page.getByRole("button", { name: "Lancer la partie" }).click();
    await expect(page.getByTestId("chess-board")).toBeVisible({ timeout: 60_000 });
  });
});
