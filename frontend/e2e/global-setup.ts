import { request } from "@playwright/test";

const API = process.env.PLAYWRIGHT_API_URL || "http://127.0.0.1:8000/api";
const USERNAME = process.env.E2E_USERNAME || "e2e_player";
const PASSWORD = process.env.E2E_PASSWORD || "E2eTestPass123!";

export default async function globalSetup() {
  const ctx = await request.newContext({ baseURL: API });

  const register = await ctx.post("/users/register/", {
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
    console.warn("E2E register:", register.status(), await register.text());
  }

  const login = await ctx.post("/auth/login/", {
    data: { username: USERNAME, password: PASSWORD },
  });
  if (!login.ok()) {
    throw new Error(`E2E login failed: ${login.status()} ${await login.text()}`);
  }

  process.env.E2E_USERNAME = USERNAME;
  process.env.E2E_PASSWORD = PASSWORD;
  await ctx.dispose();
}
