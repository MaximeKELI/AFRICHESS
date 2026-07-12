# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: matchmaking.spec.ts >> Matchmaking PvP >> deux joueurs se retrouvent en partie amicale blitz
- Location: e2e/matchmaking.spec.ts:5:7

# Error details

```
Error: locator.getAttribute: Error: strict mode violation: getByTestId('play-rated-switch') resolved to 2 elements:
    1) <button type="button" role="switch" aria-checked="true" data-testid="play-rated-switch" class="px-3 py-1 rounded-lg text-xs font-medium african-gradient text-white">Classée</button> aka getByTestId('play-rated-switch').first()
    2) <button type="button" role="switch" aria-checked="true" data-testid="play-rated-switch" class="px-3 py-1 rounded-lg text-xs font-medium african-gradient text-white">Classée</button> aka getByRole('switch', { name: 'Classée' })

Call log:
  - waiting for getByTestId('play-rated-switch')

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
  61 |   await page.waitForURL(/\/play/, { timeout: 30_000 });
  62 | }
  63 | 
  64 | export async function setUnratedMode(page: import("@playwright/test").Page) {
  65 |   const ratedSwitch = page.getByTestId("play-rated-switch");
> 66 |   if ((await ratedSwitch.getAttribute("aria-checked")) === "true") {
     |                          ^ Error: locator.getAttribute: Error: strict mode violation: getByTestId('play-rated-switch') resolved to 2 elements:
  67 |     await ratedSwitch.click();
  68 |   }
  69 |   await expectSwitchOff(ratedSwitch);
  70 | }
  71 | 
  72 | async function expectSwitchOff(switchEl: import("@playwright/test").Locator) {
  73 |   await switchEl.waitFor({ state: "visible" });
  74 |   await expect(switchEl).toHaveAttribute("aria-checked", "false");
  75 | }
  76 | 
```