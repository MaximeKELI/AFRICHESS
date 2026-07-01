"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";

interface SimulRow {
  id: number;
  title: string;
  host: string;
  host_id?: number;
  max_boards: number;
  boards: number;
}

export default function SimulPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [list, setList] = useState<SimulRow[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    gamesApi.simulList().then(({ data }) => setList(Array.isArray(data) ? data : [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user) return;
    try {
      const { data } = await gamesApi.createSimul(title || t("simul.defaultTitle"));
      setTitle("");
      load();
      if (data?.id) window.location.href = `/simul/${data.id}`;
    } catch (err) {
      setError(formatApiError(err, t("simul.error")));
    }
  };

  const join = async (id: number) => {
    if (!user) return;
    try {
      const { data } = await gamesApi.joinSimul(id);
      window.location.href = `/play?game=${data.id}`;
    } catch (err) {
      setError(formatApiError(err, t("simul.errorJoin")));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("simul.title")}</h1>
      <p className="text-sm opacity-60">{t("simul.subtitle")}</p>

      {user && (
        <div className="glass-card p-4 flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("simul.titlePlaceholder")}
            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border bg-transparent text-sm"
          />
          <button type="button" onClick={create} className="px-4 py-2 african-gradient text-white rounded-lg text-sm">
            {t("simul.create")}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-africhess-terracotta">{error}</p>}

      <div className="space-y-3">
        {list.map((s) => (
          <div key={s.id} className="glass-card p-4 flex justify-between items-center gap-4">
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-xs opacity-50">{s.host} · {s.boards}/{s.max_boards}</p>
            </div>
            {user && (
              <button type="button" onClick={() => join(s.id)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10">
                {t("simul.join")}
              </button>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-sm opacity-50 text-center py-8">{t("simul.empty")}</p>}
      </div>
    </div>
  );
}
