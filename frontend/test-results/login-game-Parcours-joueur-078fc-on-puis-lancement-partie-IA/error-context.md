# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-game.spec.ts >> Parcours joueur >> connexion puis lancement partie IA
- Location: e2e/login-game.spec.ts:7:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "AFRICHESS AFRICHESS" [ref=e4] [cursor=pointer]:
        - /url: /
        - img "AFRICHESS" [ref=e5]
        - generic [ref=e6]: AFRICHESS
      - generic [ref=e7]:
        - link "Jouer" [ref=e8] [cursor=pointer]:
          - /url: /play
        - link "Daily" [ref=e9] [cursor=pointer]:
          - /url: /play/daily
        - link "Simultanées" [ref=e10] [cursor=pointer]:
          - /url: /simul
        - link "Insights" [ref=e11] [cursor=pointer]:
          - /url: /insights
        - link "Vidéothèque" [ref=e12] [cursor=pointer]:
          - /url: /learning/videos
        - link "Répertoire" [ref=e13] [cursor=pointer]:
          - /url: /learning/repertoires
        - link "Entraînement Chessable" [ref=e14] [cursor=pointer]:
          - /url: /learning/study
        - link "Coachs" [ref=e15] [cursor=pointer]:
          - /url: /coaches
        - link "Cours" [ref=e16] [cursor=pointer]:
          - /url: /classroom
        - link "Apprendre" [ref=e17] [cursor=pointer]:
          - /url: /learning
        - link "Ouvertures" [ref=e18] [cursor=pointer]:
          - /url: /learning/openings
        - link "Problèmes" [ref=e19] [cursor=pointer]:
          - /url: /puzzles
        - link "Bots" [ref=e20] [cursor=pointer]:
          - /url: /bots
        - link "Ligues" [ref=e21] [cursor=pointer]:
          - /url: /leagues
        - link "Premium" [ref=e22] [cursor=pointer]:
          - /url: /premium
        - link "En direct" [ref=e23] [cursor=pointer]:
          - /url: /live
        - link "Amis" [ref=e24] [cursor=pointer]:
          - /url: /friends
        - link "Clubs" [ref=e25] [cursor=pointer]:
          - /url: /clubs
        - link "Tournois" [ref=e26] [cursor=pointer]:
          - /url: /tournaments
        - link "Classement africain" [ref=e27] [cursor=pointer]:
          - /url: /leaderboard
        - link "Statistiques" [ref=e28] [cursor=pointer]:
          - /url: /stats
        - link "Communauté" [ref=e29] [cursor=pointer]:
          - /url: /community
        - link "Blog" [ref=e30] [cursor=pointer]:
          - /url: /blog
        - link "Glossaire" [ref=e31] [cursor=pointer]:
          - /url: /learning/glossary
        - link "Récompenses" [ref=e32] [cursor=pointer]:
          - /url: /achievements
      - generic [ref=e33]:
        - combobox "Langue" [ref=e34]:
          - option "EN"
          - option "FR" [selected]
          - option "AR"
          - option "PT"
          - option "SW"
        - button "Thème" [ref=e35] [cursor=pointer]:
          - img [ref=e36]
        - button "Mode Zen" [ref=e38] [cursor=pointer]:
          - img [ref=e39]
        - button "Mode fluide" [ref=e42] [cursor=pointer]:
          - img [ref=e43]
        - generic [ref=e47]:
          - button "Notifications" [ref=e49] [cursor=pointer]:
            - img [ref=e50]
          - link "e2e_player" [ref=e53] [cursor=pointer]:
            - /url: /profile
            - generic [ref=e54]: E2
            - generic [ref=e55]: e2e_player
          - button "Déconnexion" [ref=e56] [cursor=pointer]
  - main [ref=e57]:
    - generic [ref=e58]:
      - heading "Connexion" [level=1] [ref=e59]
      - generic [ref=e60]:
        - textbox "Nom d'utilisateur (ex. DKELI)" [ref=e61]: e2e_player
        - textbox "Mot de passe" [ref=e62]: E2eTestPass123!
        - button "Se connecter" [ref=e63] [cursor=pointer]
        - generic [ref=e64]:
          - paragraph [ref=e65]: ou continuer avec
          - paragraph [ref=e66]: Configurez GOOGLE_OAUTH_* / GITHUB_OAUTH_* sur le serveur
        - paragraph [ref=e67]: Utilisez votre nom d'utilisateur, pas l'e-mail seul.
        - paragraph [ref=e68]:
          - text: Pas encore de compte ?
          - link "S'inscrire" [ref=e69] [cursor=pointer]:
            - /url: /register
  - contentinfo [ref=e70]:
    - generic [ref=e71]:
      - generic [ref=e72]:
        - paragraph [ref=e73]: AFRICHESS
        - paragraph [ref=e74]: Élever les échecs africains sur la scène mondiale.
      - generic [ref=e75]:
        - paragraph [ref=e76]: © 2026 AFRICHESS
        - paragraph [ref=e77]: "Developer: Maxime Dzidula KELI"
        - 'link "WhatsApp: +33 754830039" [ref=e78] [cursor=pointer]':
          - /url: https://wa.me/33754830039
  - alert [ref=e79]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const username = process.env.E2E_USERNAME || "e2e_player";
  4  | const password = process.env.E2E_PASSWORD || "E2eTestPass123!";
  5  | 
  6  | test.describe("Parcours joueur", () => {
  7  |   test("connexion puis lancement partie IA", async ({ page }) => {
  8  |     await page.goto("/login");
  9  |     await page.getByPlaceholder("Nom d'utilisateur").fill(username);
  10 |     await page.getByPlaceholder("Mot de passe").fill(password);
  11 |     await page.getByRole("button", { name: "Se connecter" }).click();
> 12 |     await page.waitForURL(/\/play/, { timeout: 30_000 });
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  13 | 
  14 |     await page.getByRole("button", { name: "Lancer la partie" }).click();
  15 |     await expect(page.getByTestId("chess-board")).toBeVisible({ timeout: 60_000 });
  16 |   });
  17 | });
  18 | 
```