"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

export default function ClassroomPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<{ code: string; title: string; current_fen: string; host: string } | null>(null);
  const [title, setTitle] = useState("");

  const join = async () => {
    const { data } = await learningApi.getClassroom(code.trim().toUpperCase());
    setRoom(data);
  };

  const create = async () => {
    const { data } = await learningApi.createClassroom(title);
    setRoom(data);
    setCode(data.code);
  };

  useEffect(() => {
    if (!room || !user || room.host !== user.username) return;
    const id = setInterval(() => {
      learningApi.getClassroom(room.code).then(({ data }) => setRoom(data)).catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [room, user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Link href="/login" className="text-africhess-gold underline">{t("nav.login")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("classroom.title")}</h1>
      <p className="text-sm opacity-60">{t("classroom.subtitle")}</p>

      {!room ? (
        <div className="glass-card p-4 space-y-4">
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("classroom.code")} className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm uppercase" />
            <button type="button" onClick={join} className="px-4 py-2 border rounded-lg text-sm">{t("classroom.join")}</button>
          </div>
          <div className="flex gap-2 border-t border-white/10 pt-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("classroom.titleLabel")} className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm" />
            <button type="button" onClick={create} className="px-4 py-2 african-gradient text-white rounded-lg text-sm">{t("classroom.create")}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">{room.title || t("classroom.session")} · <span className="font-mono text-africhess-gold">{room.code}</span></p>
          <ChessBoard fen={room.current_fen} disabled orientation="white" playSoundOnFenChange={false} />
          <p className="text-xs opacity-50">{t("classroom.host")}: {room.host}</p>
        </div>
      )}
    </div>
  );
}
