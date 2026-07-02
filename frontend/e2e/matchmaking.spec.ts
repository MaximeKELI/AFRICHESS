import { test, expect } from "@playwright/test";
import { loadE2EPlayer, loginViaUi, setUnratedMode } from "./helpers/auth";

test.describe("Matchmaking PvP", () => {
  test("deux joueurs se retrouvent en partie amicale blitz", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await loginViaUi(pageA, loadE2EPlayer("playerA"));
      await loginViaUi(pageB, loadE2EPlayer("playerB"));

      await pageA.goto("/play?mode=blitz");
      await pageB.goto("/play?mode=blitz");

      await setUnratedMode(pageA);
      await setUnratedMode(pageB);

      const mmPostA = pageA.waitForResponse(
        (response) =>
          response.url().includes("/api/games/matchmaking/") &&
          response.request().method() === "POST",
      );
      await pageA.getByTestId("play-find-opponent-quick").click();
      const resA = await mmPostA;
      expect(resA.status()).toBe(200);
      expect((await resA.json()).status).toBe("searching");

      const mmPostB = pageB.waitForResponse(
        (response) =>
          response.url().includes("/api/games/matchmaking/") &&
          response.request().method() === "POST",
      );
      await pageB.getByTestId("play-find-opponent-quick").click();
      const resB = await mmPostB;
      expect(resB.status()).toBe(201);
      const game = await resB.json();
      expect(game.id).toBeTruthy();
      expect(game.status).toBe("active");

      await pageA.waitForResponse(
        (response) =>
          response.url().includes(`/api/games/${game.id}/`) &&
          response.request().method() === "GET",
        { timeout: 30_000 },
      );

      await expect(pageA.getByTestId("chess-board")).toBeVisible({ timeout: 30_000 });
      await expect(pageB.getByTestId("chess-board")).toBeVisible({ timeout: 30_000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
