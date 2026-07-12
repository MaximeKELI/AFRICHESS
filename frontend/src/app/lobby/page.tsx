"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gamesApi, type GameChallenge } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import {
  DEFAULT_TIME_PRESET,
  TIME_CATEGORIES,
  TIME_PRESETS,
  playModeFromPreset,
  type TimePresetId,
} from "@/lib/timeControl";
import clsx from "clsx";

type ColorChoice = "white" | "black" | "random";

export default function LobbyPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();

  const [seeks, setSeeks] = useState<GameChallenge[]>([]);
  const [preset, setPreset] = useState<TimePresetId>(DEFAULT_TIME_PRESET);
  const [rated, setRated] = useState(false);
  const [color, setColor] = useState<ColorChoice>("random");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await gamesApi.listLobbySeeks();
      setSeeks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(formatApiError(e, t("lobby.error.load")));
    }
  }, [user, t]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  const createSeek = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    setStatus("");
    try {
      const mode = playModeFromPreset(preset);
      await gamesApi.createLobbySeek({
        mode,
        time_control: preset,
        is_rated: rated,
        is_timed: true,
        color,
      });
      setStatus(t("lobby.status.created"));
      await load();
    } catch (e) {
      setError(formatApiError(e, t("lobby.error.create")));
    } finally {
      setBusy(false);
    }
  };

  const accept = async (id: number) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await gamesApi.acceptLobbySeek(id);
      const gameId = data.game?.id;
      if (gameId) {
        router.push(`/play?game=${gameId}`);
        return;
      }
      setError(t("lobby.error.accept"));
    } catch (e) {
      setError(formatApiError(e, t("lobby.error.accept")));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: number) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await gamesApi.cancelLobbySeek(id);
      setStatus(t("lobby.status.cancelled"));
      await load();
    } catch (e) {
      setError(formatApiError(e, t("lobby.error.cancel")));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold mb-3">{t("lobby.title")}</h1>
        <p className="opacity-70 mb-6">{t("lobby.guest")}</p>
        <Link href="/login" className="px-5 py-2.5 rounded-lg african-gradient text-white inline-block">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  const mySeek = seeks.find((s) => s.challenger.id === user.id);
  const others = seeks.filter((s) => s.challenger.id !== user.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("lobby.title")}</h1>
      <p className="opacity-70 mb-6">{t("lobby.subtitle")}</p>

      <div className="flex flex-wrap gap-3 mb-8 text-sm">
        <Link href="/friends" className="text-africhess-gold hover:underline">
          {t("lobby.link.friend")}
        </Link>
        <span className="opacity-30">·</span>
        <Link href="/play" className="text-africhess-gold hover:underline">
          {t("lobby.link.computer")}
        </Link>
        <span className="opacity-30">·</span>
        <Link href="/play" className="text-africhess-gold hover:underline">
          {t("lobby.link.quick")}
        </Link>
      </div>

      {error && <InlineAlert className="mb-4">{error}</InlineAlert>}
      {status && <p className="text-africhess-gold mb-4 text-sm">{status}</p>}

      <section className="glass-card p-5 mb-8">
        <h2 className="font-semibold mb-4">{t("lobby.create.title")}</h2>

        <div className="space-y-4">
          {TIME_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <p className="text-xs uppercase tracking-wide opacity-50 mb-2">
                {t(`time.category.${cat.id}`)}
              </p>
              <div className="flex flex-wrap gap-2">
                {cat.presets.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPreset(id)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-sm border",
                      preset === id
                        ? "border-africhess-gold bg-africhess-gold/15"
                        : "border-white/15 hover:border-white/30"
                    )}
                  >
                    {TIME_PRESETS[id].id}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-4 items-center pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rated}
                onChange={(e) => setRated(e.target.checked)}
              />
              {t("lobby.rated")}
            </label>
            <div className="flex gap-2">
              {(["random", "white", "black"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    "px-3 py-1 rounded text-xs border capitalize",
                    color === c
                      ? "border-africhess-gold bg-africhess-gold/15"
                      : "border-white/15"
                  )}
                >
                  {t(`lobby.color.${c}`)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={busy || Boolean(mySeek)}
            onClick={() => void createSeek()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
          >
            {mySeek ? t("lobby.create.already") : t("lobby.create.submit")}
          </button>
        </div>
      </section>

      {mySeek && (
        <section className="glass-card p-4 mb-6 border border-africhess-gold/40">
          <div className="flex flex-wrap justify-between gap-3 items-center">
            <div>
              <p className="font-medium">{t("lobby.mySeek")}</p>
              <p className="text-sm opacity-70">
                {mySeek.time_control || mySeek.mode}
                {mySeek.is_rated ? ` · ${t("lobby.rated")}` : ` · ${t("lobby.casual")}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void cancel(mySeek.id)}
              className="px-4 py-2 rounded-lg border border-white/20 text-sm"
            >
              {t("lobby.cancel")}
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">{t("lobby.open.title")}</h2>
        <div className="space-y-3">
          {others.map((seek) => (
            <article
              key={seek.id}
              className="glass-card p-4 flex flex-wrap justify-between gap-3 items-center"
            >
              <div>
                <p className="font-medium">
                  {seek.challenger.display_name || seek.challenger.username}
                </p>
                <p className="text-sm opacity-70">
                  {seek.time_control || seek.mode}
                  {seek.is_rated ? ` · ${t("lobby.rated")}` : ` · ${t("lobby.casual")}`}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void accept(seek.id)}
                className="px-4 py-2 rounded-lg african-gradient text-white text-sm disabled:opacity-50"
              >
                {t("lobby.accept")}
              </button>
            </article>
          ))}
          {others.length === 0 && (
            <p className="opacity-60 text-center py-8 text-sm">{t("lobby.open.empty")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
