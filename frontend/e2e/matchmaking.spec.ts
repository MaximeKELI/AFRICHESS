import { test, expect } from "@playwright/test";
import { loadE2EPlayer, loginViaApi, preparePlayLobby } from "./helpers/auth";

test.describe("Matchmaking PvP", () => {
  test("deux joueurs se retrouvent en partie amicale blitz", async ({ browser }) => {
    test.setTimeout(90_000);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await loginViaApi(pageA, loadE2EPlayer("playerA"));
      await loginViaApi(pageB, loadE2EPlayer("playerB"));

      await pageA.goto("/play?mode=blitz");
      await pageB.goto("/play?mode=blitz");

      await preparePlayLobby(pageA);
      await preparePlayLobby(pageB);

      await pageA.request.delete("http://127.0.0.1:8000/api/games/matchmaking/");
      await pageB.request.delete("http://127.0.0.1:8000/api/games/matchmaking/");

      const findA = pageA.getByTestId("play-find-opponent").first();
      const findB = pageB.getByTestId("play-find-opponent").first();

      const [resA] = await Promise.all([
        pageA.waitForResponse(
          (response) =>
            response.url().includes("/api/games/matchmaking/") &&
            response.request().method() === "POST",
        ),
        findA.click(),
      ]);
      expect(resA.status()).toBe(200);
      expect((await resA.json()).status).toBe("searching");

      const [resB] = await Promise.all([
        pageB.waitForResponse(
          (response) =>
            response.url().includes("/api/games/matchmaking/") &&
            response.request().method() === "POST",
          { timeout: 30_000 },
        ),
        findB.click(),
      ]);
      expect(resB.status()).toBe(201);
      const game = await resB.json();
      expect(game.id).toBeTruthy();
      expect(game.status).toBe("active");

      await expect(pageA).toHaveURL(new RegExp(`[?&]game=${game.id}`), { timeout: 30_000 });
      await expect(pageB).toHaveURL(new RegExp(`[?&]game=${game.id}`), { timeout: 30_000 });
      await expect(pageA.getByTestId("chess-board")).toBeVisible({ timeout: 30_000 });
      await expect(pageB.getByTestId("chess-board")).toBeVisible({ timeout: 30_000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
