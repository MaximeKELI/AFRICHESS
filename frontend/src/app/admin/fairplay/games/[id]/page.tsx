"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowLeft } from "lucide-react";
import {
  AdminBadge,
  AdminKpi,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

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

function verdictTone(v: string): "ok" | "warn" | "danger" | "neutral" {
  if (v === "clean") return "ok";
  if (v === "likely_cheat") return "danger";
  if (v === "suspicious" || v === "review") return "warn";
  return "neutral";
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

  if (loading && !data) return <AdminSkeleton rows={8} />;
  if (error && !data) return <InlineAlert>{error}</InlineAlert>;
  if (!data) return null;

  const { game, peer_comparison, cases } = data;
  const [p0, p1] = peer_comparison.players;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/fairplay"
        className="inline-flex items-center gap-2 text-sm opacity-60 hover:opacity-100 hover:text-africhess-gold"
      >
        <ArrowLeft size={16} />
        {t("admin.fairplay.queue")}
      </Link>

      <AdminPageHeader
        title={t("admin.fairplay.gameTitle")}
        description={`${game.white ?? "?"} vs ${game.black ?? "?"} · ${game.mode} · ${game.result || "—"}`}
      />

      {error && <InlineAlert>{error}</InlineAlert>}

      <AdminPanel>
        <p className="text-xs opacity-45 font-mono mb-3 break-all">{game.id}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <AdminKpi
            label="Δ score"
            value={peer_comparison.peer_delta.overall_score.toFixed(1)}
            tone={Math.abs(peer_comparison.peer_delta.overall_score) > 20 ? "warn" : "default"}
          />
          <AdminKpi
            label="Δ top1"
            value={pct(peer_comparison.peer_delta.engine_top1_rate)}
          />
          <AdminKpi
            label={t("admin.fairplay.asymmetricShort")}
            value={
              peer_comparison.peer_delta.asymmetric_engine_use
                ? t("admin.fairplay.yes")
                : t("admin.fairplay.no")
            }
            tone={peer_comparison.peer_delta.asymmetric_engine_use ? "danger" : "ok"}
          />
        </div>
      </AdminPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[p0, p1].filter(Boolean).map((p) => (
          <AdminPanel
            key={p.user_id}
            title={
              <span className="flex items-center gap-2 flex-wrap">
                <span>
                  {p.is_white ? t("admin.fairplay.white") : t("admin.fairplay.black")} —{" "}
                  <Link
                    href={`/admin/users/${p.user_id}`}
                    className="text-africhess-gold hover:underline"
                  >
                    {p.username}
                  </Link>
                </span>
                <AdminBadge tone={verdictTone(p.verdict)}>{p.verdict}</AdminBadge>
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-[11px] uppercase tracking-wide opacity-45">
                  {t("admin.fairplay.col.score")}
                </span>
                <p className="font-mono text-lg tabular-nums">{p.overall_score.toFixed(1)}</p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wide opacity-45">
                  {t("admin.fairplay.metric.top1")}
                </span>
                <p className="font-mono text-lg tabular-nums">{pct(p.engine_top1_rate)}</p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wide opacity-45">
                  {t("admin.fairplay.metric.accuracy")}
                </span>
                <p className="font-mono tabular-nums">{p.accuracy_estimate.toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wide opacity-45">
                  {t("admin.fairplay.metric.cpl")}
                </span>
                <p className="font-mono tabular-nums">{p.avg_centipawn_loss.toFixed(0)} cp</p>
              </div>
            </div>
            {p.signals.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">{t("admin.fairplay.signals")}</p>
                <ul className="text-xs space-y-1.5 opacity-80">
                  {p.signals.map((s) => (
                    <li
                      key={s.code}
                      className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5"
                    >
                      <span className="font-mono text-africhess-gold">{s.code}</span>{" "}
                      <span className="opacity-50">({s.score.toFixed(0)})</span> — {s.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs opacity-55 font-mono">
              {t("admin.fairplay.metric.telemetry")}: blur {p.telemetry.tab_blur_count ?? 0} · paste{" "}
              {p.telemetry.copy_paste_events ?? 0} · devtools {p.telemetry.devtools_open_count ?? 0}
            </p>
          </AdminPanel>
        ))}
      </div>

      {cases.length > 0 && (
        <AdminPanel title={t("admin.fairplay.decision.title")}>
          {saved && <p className="text-sm text-emerald-500 mb-3">{t("admin.fairplay.saved")}</p>}
          <label className="block text-sm mb-3">
            {t("admin.fairplay.notes")}
            <textarea
              className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-transparent p-3 text-sm min-h-[80px] focus:border-africhess-gold focus:outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="block text-sm w-36 mb-4">
            {t("admin.fairplay.suspendDays")}
            <input
              type="number"
              min={1}
              max={365}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-transparent p-2.5 text-sm focus:border-africhess-gold focus:outline-none"
              value={suspendDays}
              onChange={(e) => setSuspendDays(Number(e.target.value))}
            />
          </label>
          <div className="space-y-4">
            {cases.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-[var(--border-subtle)] p-4 space-y-3"
              >
                <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                  {c.username}
                  <AdminBadge tone="neutral">{c.status}</AdminBadge>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyCase === c.id}
                    className="px-3 py-2 rounded-xl text-sm border border-emerald-500/40 hover:bg-emerald-500/10 disabled:opacity-50"
                    onClick={() => decide(c.id, "dismissed", "none")}
                  >
                    {t("admin.fairplay.decision.dismiss")}
                  </button>
                  <button
                    type="button"
                    disabled={busyCase === c.id}
                    className="px-3 py-2 rounded-xl text-sm border border-amber-500/40 hover:bg-amber-500/10 disabled:opacity-50"
                    onClick={() => decide(c.id, "confirmed", "warn")}
                  >
                    {t("admin.fairplay.decision.confirmWarn")}
                  </button>
                  <button
                    type="button"
                    disabled={busyCase === c.id}
                    className="px-3 py-2 rounded-xl text-sm border border-orange-500/40 hover:bg-orange-500/10 disabled:opacity-50"
                    onClick={() => decide(c.id, "confirmed", "matchmaking_block", true)}
                  >
                    {t("admin.fairplay.decision.confirmBlock")}
                  </button>
                  <button
                    type="button"
                    disabled={busyCase === c.id}
                    className="px-3 py-2 rounded-xl text-sm border border-red-500/40 hover:bg-red-500/10 disabled:opacity-50"
                    onClick={() => decide(c.id, "confirmed", "suspend_temp", true)}
                  >
                    {t("admin.fairplay.decision.confirmSuspend")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {game.pgn && (
        <AdminPanel title="PGN" bodyClassName="p-3 sm:p-4">
          <pre className="text-xs font-mono opacity-70 whitespace-pre-wrap break-all max-h-48 overflow-y-auto m-0">
            {game.pgn}
          </pre>
        </AdminPanel>
      )}
    </div>
  );
}
