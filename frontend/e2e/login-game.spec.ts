import { test, expect } from "@playwright/test";
import { loginViaUi } from "./helpers/auth";

test.describe("Parcours joueur", () => {
  test("connexion puis lancement partie IA", async ({ page }) => {
    await loginViaUi(page);

    const aiGame = page.waitForResponse(
      (response) =>
        response.url().includes("/api/games/ai/") && response.request().method() === "POST",
    );
    await page.getByTestId("play-start-ai").click();
    const created = await aiGame;
    expect(created.status()).toBe(201);

    await expect(page).toHaveURL(/[?&]game=/, { timeout: 30_000 });
    await expect(page.getByTestId("chess-board")).toBeVisible();
  });
});
