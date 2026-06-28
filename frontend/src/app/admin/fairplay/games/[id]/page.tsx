"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowLeft } from "lucide-react";

interface PlayerReport {
  id: number;
  user_id: number;
  username: string;
  verdict: string;
  overall_score: number;
  engine_top1_rate: number;
  engine_top3_rate: number;
  avg_centipawn_loss: number;
  accuracy_estimate: number;
  signals: { code: string; score: number; detail: string }[];
  telemetry: Record<string, number>;
  is_white: boolean;
  review_status: string | null;
}

interface GameDetail {
  game: {
    id: string;
    mode: string;
    result: string;
    pgn: string;
    white: string | null;
    black: string | null;
  };
  peer_comparison: {
    players: PlayerReport[];
    peer_delta: {
      overall_score: number;
      engine_top1_rate: number;
      asymmetric_engine_use: boolean;
    };
  };
  cases: {
    id: number;
    status: string;
    decision: string;
    notes: string;
    username: string;
    report_id: number;
  }[];
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function AdminFairPlayGamePage() {
  const params = useParams();
  const gameId = String(params.id);
  const { t } = useTranslation();
  const [data, setData] = useState<GameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [suspendDays, setSuspendDays] = useState(7);
  const [saved, setSaved] = useState(false);
  const [busyCase, setBusyCase] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .fairplayGame(gameId)
      .then(({ data: d }) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [gameId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (
    caseId: number,
    status: string,
    decision: string,
    needsDays = false
  ) => {
    setBusyCase(caseId);
    setSaved(false);
    try {
      await adminApi.fairplayDecide(caseId, {
        status,
        decision,
        notes,
        suspend_days: needsDays ? suspendDays : undefined,
      });
      setSaved(true);
      load();
    } catch (err) {
      setError(formatApiError(err, t("admin.error.load")));
    } finally {
      setBusyCase(null);
    }
  };

  if (loading) return <p className="opacity-60">{t("common.loading")}</p>;
  if (error) return <InlineAlert>{error}</InlineAlert>;
  if (!data) return null;

  const { game, peer_comparison, cases } = data;
  const [p0, p1] = peer_comparison.players;

  return (
    <div className="space-y-8">
      <Link href="/admin/fairplay" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
        <ArrowLeft size={16} />
        {t("admin.fairplay.queue")}
      </Link>

      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold mb-1">{t("admin.fairplay.gameTitle")}</h2>
        <p className="text-sm opacity-70">
          {game.white} vs {game.black} — {game.mode} — {game.result || "—"}
        </p>
        <p className="text-xs opacity-50 mt-1 font-mono">{game.id}</p>
        {peer_comparison.peer_delta.asymmetric_engine_use && (
          <p className="mt-3 text-sm text-orange-400 font-medium">{t("admin.fairplay.asymmetric")}</p>
        )}
        <p className="text-sm opacity-60 mt-2">
          Δ score {peer_comparison.peer_delta.overall_score} · Δ top1{" "}
          {pct(peer_comparison.peer_delta.engine_top1_rate)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[p0, p1].filter(Boolean).map((p) => (
          <div key={p.user_id} className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {p.is_white ? t("admin.fairplay.white") : t("admin.fairplay.black")} —{" "}
                <Link href={`/admin/users/${p.user_id}`} className="text-africhess-gold hover:underline">
                  {p.username}
                </Link>
              </h3>
              <span className="text-sm uppercase opacity-70">{p.verdict}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="opacity-60">{t("admin.fairplay.col.score")}</span>
                <p className="font-mono text-lg">{p.overall_score.toFixed(1)}</p>
              </div>
              <div>
                <span className="opacity-60">{t("admin.fairplay.metric.top1")}</span>
                <p className="font-mono text-lg">{pct(p.engine_top1_rate)}</p>
              </div>
              <div>
                <span className="opacity-60">{t("admin.fairplay.metric.accuracy")}</span>
                <p className="font-mono">{p.accuracy_estimate.toFixed(1)}%</p>
              </div>
              <div>
                <span className="opacity-60">{t("admin.fairplay.metric.cpl")}</span>
                <p className="font-mono">{p.avg_centipawn_loss.toFixed(0)} cp</p>
              </div>
            </div>
            {p.signals.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{t("admin.fairplay.signals")}</p>
                <ul className="text-xs space-y-1 opacity-80">
                  {p.signals.map((s) => (
                    <li key={s.code}>
                      <span className="font-mono">{s.code}</span> ({s.score.toFixed(0)}) — {s.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1">{t("admin.fairplay.metric.telemetry")}</p>
              <p className="text-xs opacity-70 font-mono">
                blur {p.telemetry.tab_blur_count ?? 0} · paste {p.telemetry.copy_paste_events ?? 0} ·
                devtools {p.telemetry.devtools_open_count ?? 0}
              </p>
            </div>
          </div>
        ))}
      </div>

      {cases.length > 0 && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-bold">{t("admin.fairplay.decision.title")}</h3>
          {saved && <p className="text-sm text-emerald-400">{t("admin.fairplay.saved")}</p>}
          <label className="block text-sm">
            {t("admin.fairplay.notes")}
            <textarea
              className="mt-1 w-full rounded-lg border bg-transparent p-2 text-sm min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="block text-sm w-32">
            {t("admin.fairplay.suspendDays")}
            <input
              type="number"
              min={1}
              max={365}
              className="mt-1 w-full rounded-lg border bg-transparent p-2 text-sm"
              value={suspendDays}
              onChange={(e) => setSuspendDays(Number(e.target.value))}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {cases.map((c) => (
              <div key={c.id} className="w-full border-t border-white/10 pt-4 space-y-2">
                <p className="text-sm font-medium">{c.username} — {c.status}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyCase === c.id}
                    className="px-3 py-1.5 rounded-lg text-sm border hover:border-emerald-500/50"
                    onClick={() => decide(c.id, "dismissed", "none")}
                  >
                    {t("admin.fairplay.decision.dismiss")}
                  </button>
                  <button
                    type="button"
                    disabled={busyCase === c.id}
                    className="px-3 py-1.5 rounded-lg text-sm border hover:border-amber-500/50"
                    onClick={() => decide(c.id, "confirmed", "warn")}
                  >
                    {t("admin.fairplay.decision.confirmWarn")}
                  </button>
                  <button
                    type="button"
                    disabled={busyCase === c.id}
                    className="px-3 py-1.5 rounded-lg text-sm border hover:border-orange-500/50"
                    onClick={() => decide(c.id, "confirmed", "matchmaking_block", true)}
                  >
                    {t("admin.fairplay.decision.confirmBlock")}
                  </button>
                  <button
                    type="button"
                    disabled={busyCase === c.id}
                    className="px-3 py-1.5 rounded-lg text-sm border hover:border-red-500/50"
                    onClick={() => decide(c.id, "confirmed", "suspend_temp", true)}
                  >
                    {t("admin.fairplay.decision.confirmSuspend")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {game.pgn && (
        <div className="glass-card p-4">
          <p className="text-xs font-mono opacity-70 whitespace-pre-wrap break-all">{game.pgn}</p>
        </div>
      )}
    </div>
  );
}
