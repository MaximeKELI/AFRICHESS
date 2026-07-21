import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

/** Dev-only helper — POST to seed bots + restart backend. */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const root = path.resolve(process.cwd(), "..");
  const steps: Array<{ step: string; ok: boolean; out: string }> = [];

  async function run(step: string, cmd: string, args: string[]) {
    try {
      const { stdout, stderr } = await execFileAsync(cmd, args, {
        cwd: root,
        timeout: 180_000,
        env: process.env,
        maxBuffer: 4 * 1024 * 1024,
      });
      steps.push({ step, ok: true, out: `${stdout || ""}${stderr || ""}`.trim().slice(0, 3000) });
      return true;
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      steps.push({
        step,
        ok: false,
        out: `${e.stdout || ""}${e.stderr || ""}${e.message || ""}`.trim().slice(0, 3000),
      });
      return false;
    }
  }

  await run("seed_bots", "docker", [
    "compose",
    "exec",
    "-T",
    "backend",
    "python",
    "manage.py",
    "seed_bots",
    "--deactivate-old",
  ]);
  await run("restart_backend", "docker", ["compose", "restart", "backend"]);

  let verify = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/games/bots/ladder/?lang=fr", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const elite = (data.tiers || []).find((t: { id: string }) => t.id === "elite");
        const bots = elite?.bots || [];
        verify = bots
          .filter((b: { slug: string }) =>
            ["blitzstream", "maxime-keli", "julien-song", "joachim-mouhamad"].includes(b.slug)
          )
          .map((b: { slug: string; name: string; elo: number }) => ({
            slug: b.slug,
            name: b.name,
            elo: b.elo,
          }));
        const kb = bots.find((b: { slug: string }) => b.slug === "blitzstream");
        if (kb?.name === "Kevin Bordi" && kb?.elo === 3000) break;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  return NextResponse.json({ ok: true, steps, verify });
}
