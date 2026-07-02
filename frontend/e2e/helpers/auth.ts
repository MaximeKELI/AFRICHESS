import fs from "node:fs";
import path from "node:path";

type E2ECredentials = {
  username: string;
  password: string;
};

export function loadE2ECredentials(): E2ECredentials {
  const file = path.join(__dirname, ".auth", "credentials.json");
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8")) as E2ECredentials;
  }
  return {
    username: process.env.E2E_USERNAME || "e2e_player",
    password: process.env.E2E_PASSWORD || "E2eTestPass123!",
  };
}

export async function loginViaUi(page: import("@playwright/test").Page) {
  const { username, password } = loadE2ECredentials();
  await page.goto("/login");
  await page.locator("#login-username").fill(username);
  await page.locator("#login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/play/, { timeout: 30_000 });
}
