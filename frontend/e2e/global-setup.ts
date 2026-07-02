import fs from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";

const API = (process.env.PLAYWRIGHT_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const PASSWORD = process.env.E2E_PASSWORD || "E2eTestPass123!";
const AUTH_DIR = path.join(__dirname, ".auth");

const PLAYERS = [
  { key: "player", username: process.env.E2E_USERNAME || "e2e_player", email: "e2e@test.africhess.com" },
  { key: "playerA", username: "e2e_player_a", email: "e2e_a@test.africhess.com" },
  { key: "playerB", username: "e2e_player_b", email: "e2e_b@test.africhess.com" },
] as const;

async function waitForBackend() {
  const ctx = await request.newContext();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const health = await ctx.get(`${API.replace(/\/api$/, "")}/api/health/`);
      if (health.ok()) {
        await ctx.dispose();
        return;
      }
    } catch {
      // backend not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await ctx.dispose();
  throw new Error("Backend health check failed before e2e setup");
}

async function ensureUser(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  username: string,
  email: string,
) {
  const register = await ctx.post(`${API}/users/register/`, {
    data: {
      username,
      email,
      password: PASSWORD,
      password_confirm: PASSWORD,
      country: "SN",
      chess_level: "intermediate",
    },
  });
  if (!register.ok() && register.status() !== 400) {
    throw new Error(`E2E register failed for ${username}: ${register.status()} ${await register.text()}`);
  }

  const login = await ctx.post(`${API}/auth/login/`, {
    data: { username, password: PASSWORD },
  });
  if (!login.ok()) {
    throw new Error(`E2E login failed for ${username}: ${login.status()} ${await login.text()}`);
  }
}

export default async function globalSetup() {
  await waitForBackend();

  const ctx = await request.newContext();
  const credentials: Record<string, { username: string; password: string }> = {};

  for (const player of PLAYERS) {
    await ensureUser(ctx, player.username, player.email);
    credentials[player.key] = { username: player.username, password: PASSWORD };
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUTH_DIR, "credentials.json"), JSON.stringify(credentials, null, 2));

  await ctx.dispose();
}
