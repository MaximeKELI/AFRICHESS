import fs from "node:fs";
import path from "node:path";
import { expect, request } from "@playwright/test";

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

const API = (process.env.PLAYWRIGHT_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const BASE = (process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

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

/** Connexion UI (teste le formulaire) — sensible au rate-limit login_burst. */
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

/** Connexion via API + cookies — évite le throttle UI pour les parcours métier. */
export async function loginViaApi(
  page: import("@playwright/test").Page,
  creds: E2ECredentials = loadE2ECredentials(),
) {
  const ctx = await request.newContext();
  const login = await ctx.post(`${API}/auth/login/`, {
    data: { username: creds.username, password: creds.password },
  });
  if (!login.ok()) {
    throw new Error(`E2E API login failed for ${creds.username}: ${login.status()} ${await login.text()}`);
  }
  const body = (await login.json()) as { access?: string; refresh?: string };
  await ctx.dispose();
  if (!body.access) {
    throw new Error(`E2E API login missing access token for ${creds.username}`);
  }

  const url = new URL(BASE);
  const cookies = [
    {
      name: "access_token",
      value: body.access,
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: url.protocol === "https:",
      sameSite: "Strict" as const,
    },
  ];
  if (body.refresh) {
    cookies.push({
      name: "refresh_token",
      value: body.refresh,
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: url.protocol === "https:",
      sameSite: "Strict" as const,
    });
  }
  await page.context().addCookies(cookies);
  await page.goto("/play");
  await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible({ timeout: 30_000 });
}

export async function setUnratedMode(page: import("@playwright/test").Page) {
  // Desktop + mobile rendent chacun un switch (même testid).
  const switches = page.getByTestId("play-rated-switch");
  const count = await switches.count();
  for (let i = 0; i < count; i += 1) {
    const sw = switches.nth(i);
    if (!(await sw.isVisible())) continue;
    if ((await sw.getAttribute("aria-checked")) === "true") {
      await sw.click();
    }
    await expect(sw).toHaveAttribute("aria-checked", "false");
  }
}
