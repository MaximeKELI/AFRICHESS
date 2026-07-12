# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentification >> connexion puis déconnexion
- Location: e2e/auth.spec.ts:10:7

# Error details

```
Error: page.goto: net::ERR_ABORTED at http://127.0.0.1:3000/profile
Call log:
  - navigating to "http://127.0.0.1:3000/profile", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Aller au contenu principal" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - navigation [ref=e3]:
    - generic [ref=e4]:
      - link "AFRICHESS AFRICHESS" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "AFRICHESS" [ref=e6]
        - generic [ref=e7]: AFRICHESS
      - generic [ref=e8]:
        - link "Jouer" [ref=e9] [cursor=pointer]:
          - /url: /play
        - link "Problèmes" [ref=e10] [cursor=pointer]:
          - /url: /puzzles
        - link "Apprendre" [ref=e11] [cursor=pointer]:
          - /url: /learning
        - link "En direct" [ref=e12] [cursor=pointer]:
          - /url: /live
        - button "Plus" [ref=e14] [cursor=pointer]:
          - text: Plus
          - img [ref=e15]
      - generic [ref=e17]:
        - generic [ref=e18]:
          - combobox "Langue" [ref=e19]:
            - option "EN"
            - option "FR" [selected]
            - option "AR"
            - option "PT"
            - option "SW"
          - button "Thème" [ref=e20] [cursor=pointer]:
            - img [ref=e21]
          - button "Mode Zen" [ref=e23] [cursor=pointer]:
            - img [ref=e24]
          - button "Mode fluide" [ref=e27] [cursor=pointer]:
            - img [ref=e28]
        - generic [ref=e32]:
          - link "Connexion" [ref=e33] [cursor=pointer]:
            - /url: /login
          - link "Inscription" [ref=e34] [cursor=pointer]:
            - /url: /register
  - main [ref=e35]:
    - generic [ref=e36]:
      - heading "Jouer — Blitz" [level=1] [ref=e37]
      - paragraph [ref=e38]: Connectez-vous pour affronter des joueurs en direct ou l'IA.
      - link "Connexion" [ref=e39] [cursor=pointer]:
        - /url: /login
      - paragraph [ref=e40]:
        - text: Pas encore de compte ?
        - link "Inscription" [ref=e41] [cursor=pointer]:
          - /url: /register
  - alert [ref=e42]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { loadE2ECredentials, loginViaUi } from "./helpers/auth";
  3  | 
  4  | test.describe("Authentification", () => {
  5  |   test("profil non connecté affiche le lien connexion", async ({ page }) => {
  6  |     await page.goto("/profile");
  7  |     await expect(page.getByRole("link", { name: /connexion|login/i })).toBeVisible();
  8  |   });
  9  | 
  10 |   test("connexion puis déconnexion", async ({ page }) => {
  11 |     await loginViaUi(page);
  12 |     await page.getByRole("button", { name: "Déconnexion" }).click();
> 13 |     await page.goto("/profile");
     |                ^ Error: page.goto: net::ERR_ABORTED at http://127.0.0.1:3000/profile
  14 |     await expect(page.getByRole("link", { name: /connexion|login/i })).toBeVisible();
  15 |   });
  16 | 
  17 |   test("identifiants e2e disponibles", () => {
  18 |     const { username, password } = loadE2ECredentials();
  19 |     expect(username.length).toBeGreaterThan(2);
  20 |     expect(password.length).toBeGreaterThan(8);
  21 |   });
  22 | });
  23 | 
```