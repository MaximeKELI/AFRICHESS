import { spawn } from "child_process";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const MAX_CHARS = 500;
const REPO_ROOT = path.resolve(process.cwd(), "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "tts_wav.py");

function synthesize(text: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const proc = spawn("python3", [SCRIPT, text], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      const buf = Buffer.concat(chunks);
      resolve(buf.length > 0 ? buf : null);
    });
    proc.on("error", () => resolve(null));
  });
}

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text")?.trim().slice(0, MAX_CHARS);
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const wav = await synthesize(text);
  if (!wav) {
    return NextResponse.json({ error: "TTS unavailable" }, { status: 503 });
  }

  return new NextResponse(wav, {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
