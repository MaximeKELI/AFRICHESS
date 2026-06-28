/** URLs API / WebSocket — une seule source de vérité (dev local : port 8003). */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8003/api";

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  API_URL.replace(/\/api\/?$/, "");

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8003";

export const MEDIA_ORIGIN =
  process.env.NEXT_PUBLIC_MEDIA_ORIGIN || API_ORIGIN;

export function apiPortLabel(): string {
  try {
    return new URL(API_URL).port || "8003";
  } catch {
    return "8003";
  }
}

/** Alias utilisé par aiSpeech et autres modules legacy. */
export function apiBase(): string {
  return API_URL;
}
