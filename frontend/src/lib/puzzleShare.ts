/** Génère une image de partage pour le daily puzzle résolu. */
export async function capturePuzzleShareImage(opts: {
  title: string;
  progress: string;
  streak?: number;
  elo?: number;
}): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grd = ctx.createLinearGradient(0, 0, 0, 480);
  grd.addColorStop(0, "#1a3d5c");
  grd.addColorStop(0.45, "#2d6a8f");
  grd.addColorStop(0.75, "#3d7a45");
  grd.addColorStop(1, "#1b4d28");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 720, 480);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 6; i++) {
    const y = 280 - i * 36;
    const w = 120 + i * 55;
    ctx.fillRect((720 - w) / 2, y, w, 22);
  }

  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillStyle = "#d4a843";
  ctx.textAlign = "center";
  ctx.fillText("♙", 360, 200);

  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillStyle = "#6ee7a8";
  ctx.fillText(opts.title, 360, 260);

  ctx.font = "600 42px system-ui, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(opts.progress, 360, 320);

  if (opts.streak != null && opts.streak > 0) {
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillStyle = "#ffd54a";
    ctx.fillText(`🔥 ${opts.streak}`, 360, 360);
  }

  ctx.font = "16px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("AFRICHESS", 360, 440);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
  });
}

export async function sharePuzzleResult(opts: {
  title: string;
  progress: string;
  streak?: number;
  text: string;
}): Promise<boolean> {
  const blob = await capturePuzzleShareImage(opts);
  if (!blob) return false;
  const file = new File([blob], "africhess-puzzle.png", { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        files: [file],
      });
      return true;
    } catch {
      /* fallthrough */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "africhess-puzzle.png";
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
