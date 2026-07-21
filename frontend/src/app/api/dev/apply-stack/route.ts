import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

/**
 * Dev-only: synchronise le catalogue bots + redémarre le backend Docker
 * pour charger le code Python à jour (chat, live TV, bots élite…).
 * POST /api/dev/apply-stack
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 403 });
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
      const out = `${stdout || ""}${stderr || ""}`.trim();
      steps.push({ step, ok: true, out: out.slice(0, 4000) });
      return true;
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      const out = `${e.stdout || ""}${e.stderr || ""}${e.message || ""}`.trim();
      steps.push({ step, ok: false, out: out.slice(0, 4000) });
      return false;
    }
  }

  // 1) Seed bots dans le container backend (code monté à jour)
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

  // 2) Redémarrer backend (+ workers) pour charger consumers/views à jour
  await run("restart_backend", "docker", ["compose", "restart", "backend", "celery", "celery-beat"]);

  // 3) Attendre santé API
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/games/bots/ladder/?lang=fr", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          tiers?: Array<{ id: string; bots?: Array<{ slug: string; elo: number; name: string }> }>;
        };
        const elite = data.tiers?.find((t) => t.id === "elite");
        const bySlug = Object.fromEntries((elite?.bots || []).map((b) => [b.slug, b]));
        healthy = Boolean(
          bySlug["maxime-keli"]?.elo === 3100 &&
            bySlug["blitzstream"]?.elo === 3000 &&
            bySlug["julien-song"]?.elo === 2800 &&
            bySlug["joachim-mouhamad"]?.elo === 2750
        );
        steps.push({
          step: "verify_elite",
          ok: healthy,
          out: JSON.stringify(
            {
              maxime: bySlug["maxime-keli"],
              blitzstream: bySlug["blitzstream"],
              julien: bySlug["julien-song"],
              joachim: bySlug["joachim-mouhamad"],
              elite_count: elite?.bots?.length ?? 0,
            },
            null,
            2
          ),
        });
        if (healthy) break;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  return NextResponse.json({ ok: healthy, steps }, { status: healthy ? 200 : 500 });
}

export async function GET() {
  return NextResponse.json({
    usage: "POST /api/dev/apply-stack — seed bots + restart backend (dev only)",
  });
}
