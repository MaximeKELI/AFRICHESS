import fs from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";

const API = (process.env.PLAYWRIGHT_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const USERNAME = process.env.E2E_USERNAME || "e2e_player";
const PASSWORD = process.env.E2E_PASSWORD || "E2eTestPass123!";
const AUTH_DIR = path.join(__dirname, ".auth");

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

export default async function globalSetup() {
  await waitForBackend();

  const ctx = await request.newContext();

  const register = await ctx.post(`${API}/users/register/`, {
    data: {
      username: USERNAME,
      email: "e2e@test.africhess.com",
      password: PASSWORD,
      password_confirm: PASSWORD,
      country: "SN",
      chess_level: "intermediate",
    },
  });
  if (!register.ok() && register.status() !== 400) {
    throw new Error(`E2E register failed: ${register.status()} ${await register.text()}`);
  }

  const login = await ctx.post(`${API}/auth/login/`, {
    data: { username: USERNAME, password: PASSWORD },
  });
  if (!login.ok()) {
    throw new Error(`E2E login failed: ${login.status()} ${await login.text()}`);
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(AUTH_DIR, "credentials.json"),
    JSON.stringify({ username: USERNAME, password: PASSWORD }, null, 2),
  );

  await ctx.dispose();
}
