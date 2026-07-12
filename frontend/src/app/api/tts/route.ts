import { spawn } from "child_process";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const MAX_CHARS = 1200;
const REPO_ROOT = path.resolve(process.cwd(), "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "tts_wav.py");
const BACKEND_TTS = process.env.AFRICHESS_TTS_BACKEND_URL || "http://127.0.0.1:8000/api/games/tts/";

function sniffAudioType(buf: Buffer): string {
  if (buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "RIFF") {
    return "audio/wav";
  }
  return "audio/mpeg";
}

function runPythonScript(text: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const proc = spawn("python3", [SCRIPT, text], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONPATH: path.join(REPO_ROOT, "backend") },
    });
    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.on("close", (code) => {
      const buf = Buffer.concat(chunks);
      resolve(code === 0 && buf.length > 0 ? buf : null);
    });
    proc.on("error", () => resolve(null));
  });
}

/** Synthèse via le conteneur backend (edge-tts déjà installé). */
function runDockerBackend(text: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const py = [
      "from apps.games.tts import synthesize_speech",
      `r = synthesize_speech(${JSON.stringify(text)})`,
      "import sys",
      "sys.stdout.buffer.write(r[0] if r else b'')",
    ].join("; ");
    const proc = spawn(
      "docker",
      ["exec", "-i", "africhess-backend-1", "python", "-c", py],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.on("close", (code) => {
      const buf = Buffer.concat(chunks);
      resolve(code === 0 && buf.length > 64 ? buf : null);
    });
    proc.on("error", () => resolve(null));
  });
}

async function fetchBackendHttp(text: string, authHeader: string | null): Promise<Buffer | null> {
  try {
    const res = await fetch(BACKEND_TTS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 64 ? buf : null;
  } catch {
    return null;
  }
}

async function synthesize(text: string, authHeader: string | null): Promise<Buffer | null> {
  return (
    (await runPythonScript(text)) ||
    (await runDockerBackend(text)) ||
    (await fetchBackendHttp(text, authHeader))
  );
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
  const auth = request.headers.get("authorization");
  const audio = await synthesize(text, auth);
  if (!audio) {
    return NextResponse.json({ error: "TTS unavailable" }, { status: 503 });
  }
  return new NextResponse(new Uint8Array(audio), {
    status: 200,
    headers: {
      "Content-Type": sniffAudioType(audio),
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
