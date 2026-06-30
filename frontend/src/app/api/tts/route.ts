import { spawn } from "child_process";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const MAX_CHARS = 1200;
const REPO_ROOT = path.resolve(process.cwd(), "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "tts_wav.py");

function synthesize(text: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const proc = spawn("python3", [SCRIPT, text], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        console.warn("tts_wav.py failed:", stderr.slice(0, 200));
        resolve(null);
        return;
      }
      const buf = Buffer.concat(chunks);
      resolve(buf.length > 0 ? buf : null);
    });
    proc.on("error", () => resolve(null));
  });
}

async function readText(request: NextRequest): Promise<string | null> {
  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { text?: string };
      return body.text?.trim().slice(0, MAX_CHARS) ?? null;
    } catch {
      return null;
    }
  }
  return request.nextUrl.searchParams.get("text")?.trim().slice(0, MAX_CHARS) ?? null;
}

export async function GET(request: NextRequest) {
  const text = await readText(request);
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  const wav = await synthesize(text);
  if (!wav) {
    return NextResponse.json({ error: "TTS unavailable" }, { status: 503 });
  }
  return new NextResponse(new Uint8Array(wav), {
    status: 200,
    headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
