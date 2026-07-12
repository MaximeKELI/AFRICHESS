# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentification >> connexion puis déconnexion
- Location: e2e/auth.spec.ts:10:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
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
      - heading "Connexion" [level=1] [ref=e37]
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]: Nom d'utilisateur ou e-mail
          - textbox "Nom d'utilisateur ou e-mail" [ref=e41]: e2e_player
        - generic [ref=e42]:
          - generic [ref=e43]: Mot de passe
          - textbox "Mot de passe" [ref=e44]: E2eTestPass123!
        - alert [ref=e45]: Trop de tentatives. Attendez quelques minutes puis réessayez.
        - button "Se connecter" [ref=e46] [cursor=pointer]
        - paragraph [ref=e47]: Nom d'utilisateur ou e-mail. Si votre e-mail est partagé entre plusieurs comptes, utilisez le nom d'utilisateur (ex. DKELI).
        - paragraph [ref=e48]:
          - text: Pas encore de compte ?
          - link "S'inscrire" [ref=e49] [cursor=pointer]:
            - /url: /register
  - contentinfo [ref=e50]:
    - generic [ref=e51]:
      - generic [ref=e52]:
        - paragraph [ref=e53]: AFRICHESS
        - paragraph [ref=e54]: Élever le jeu d'échecs sur la scène mondiale.
        - navigation [ref=e55]:
          - link "Jouer" [ref=e56] [cursor=pointer]:
            - /url: /play
          - link "Problèmes" [ref=e57] [cursor=pointer]:
            - /url: /puzzles
          - link "Politique de confidentialité" [ref=e58] [cursor=pointer]:
            - /url: /legal/privacy
      - generic [ref=e59]:
        - paragraph [ref=e60]: © 2026 AFRICHESS
        - paragraph [ref=e61]: Développé par Maxime Dzidula KELI
        - link "Contact WhatsApp" [ref=e62] [cursor=pointer]:
          - /url: https://wa.me/33754830039
  - alert [ref=e63]
```

# Test source

```ts
  1  | import fs from "node:fs";
  2  | import path from "node:path";
  3  | import { expect } from "@playwright/test";
  4  | 
  5  | export type E2ECredentials = {
  6  |   username: string;
  7  |   password: string;
  8  | };
  9  | 
  10 | type E2EAuthFile = {
  11 |   player?: E2ECredentials;
  12 |   playerA?: E2ECredentials;
  13 |   playerB?: E2ECredentials;
  14 |   username?: string;
  15 |   password?: string;
  16 | };
  17 | 
  18 | function readAuthFile(): E2EAuthFile {
  19 |   const file = path.join(__dirname, ".auth", "credentials.json");
  20 |   if (!fs.existsSync(file)) {
  21 |     return {};
  22 |   }
  23 |   return JSON.parse(fs.readFileSync(file, "utf8")) as E2EAuthFile;
  24 | }
  25 | 
  26 | export function loadE2ECredentials(): E2ECredentials {
  27 |   const data = readAuthFile();
  28 |   if (data.player) {
  29 |     return data.player;
  30 |   }
  31 |   if (data.username && data.password) {
  32 |     return { username: data.username, password: data.password };
  33 |   }
  34 |   return {
  35 |     username: process.env.E2E_USERNAME || "e2e_player",
  36 |     password: process.env.E2E_PASSWORD || "E2eTestPass123!",
  37 |   };
  38 | }
  39 | 
  40 | export function loadE2EPlayer(which: "playerA" | "playerB"): E2ECredentials {
  41 |   const data = readAuthFile();
  42 |   const creds = data[which];
  43 |   if (creds) {
  44 |     return creds;
  45 |   }
  46 |   const fallback = which === "playerA" ? "e2e_player_a" : "e2e_player_b";
  47 |   return {
  48 |     username: fallback,
  49 |     password: process.env.E2E_PASSWORD || "E2eTestPass123!",
  50 |   };
  51 | }
  52 | 
  53 | export async function loginViaUi(
  54 |   page: import("@playwright/test").Page,
  55 |   creds: E2ECredentials = loadE2ECredentials(),
  56 | ) {
  57 |   await page.goto("/login");
  58 |   await page.locator("#login-username").fill(creds.username);
  59 |   await page.locator("#login-password").fill(creds.password);
  60 |   await page.getByTestId("login-submit").click();
> 61 |   await page.waitForURL(/\/play/, { timeout: 30_000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  62 | }
  63 | 
  64 | export async function setUnratedMode(page: import("@playwright/test").Page) {
  65 |   // Desktop + mobile peuvent rendre le même switch (2 nœuds dans le DOM).
  66 |   const ratedSwitch = page.getByTestId("play-rated-switch").first();
  67 |   if ((await ratedSwitch.getAttribute("aria-checked")) === "true") {
  68 |     await ratedSwitch.click();
  69 |   }
  70 |   await expectSwitchOff(ratedSwitch);
  71 | }
  72 | 
  73 | async function expectSwitchOff(switchEl: import("@playwright/test").Locator) {
  74 |   await switchEl.waitFor({ state: "visible" });
  75 |   await expect(switchEl).toHaveAttribute("aria-checked", "false");
  76 | }
  77 | 
```