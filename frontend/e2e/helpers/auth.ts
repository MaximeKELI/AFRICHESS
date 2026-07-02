import fs from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";

export type E2ECredentials = {
  username: string;
  password: string;
};

type E2EAuthFile = {
  player?: E2ECredentials;
  playerA?: E2ECredentials;
  playerB?: E2ECredentials;
  username?: string;
  password?: string;
};

function readAuthFile(): E2EAuthFile {
  const file = path.join(__dirname, ".auth", "credentials.json");
  if (!fs.existsSync(file)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as E2EAuthFile;
}

export function loadE2ECredentials(): E2ECredentials {
  const data = readAuthFile();
  if (data.player) {
    return data.player;
  }
  if (data.username && data.password) {
    return { username: data.username, password: data.password };
  }
  return {
    username: process.env.E2E_USERNAME || "e2e_player",
    password: process.env.E2E_PASSWORD || "E2eTestPass123!",
  };
}

export function loadE2EPlayer(which: "playerA" | "playerB"): E2ECredentials {
  const data = readAuthFile();
  const creds = data[which];
  if (creds) {
    return creds;
  }
  const fallback = which === "playerA" ? "e2e_player_a" : "e2e_player_b";
  return {
    username: fallback,
    password: process.env.E2E_PASSWORD || "E2eTestPass123!",
  };
}

export async function loginViaUi(
  page: import("@playwright/test").Page,
  creds: E2ECredentials = loadE2ECredentials(),
) {
  await page.goto("/login");
  await page.locator("#login-username").fill(creds.username);
  await page.locator("#login-password").fill(creds.password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/play/, { timeout: 30_000 });
}

export async function setUnratedMode(page: import("@playwright/test").Page) {
  const ratedSwitch = page.getByTestId("play-rated-switch");
  if ((await ratedSwitch.getAttribute("aria-checked")) === "true") {
    await ratedSwitch.click();
  }
  await expectSwitchOff(ratedSwitch);
}

async function expectSwitchOff(switchEl: import("@playwright/test").Locator) {
  await switchEl.waitFor({ state: "visible" });
  await expect(switchEl).toHaveAttribute("aria-checked", "false");
}
