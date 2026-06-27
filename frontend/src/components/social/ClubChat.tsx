"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { UserFlair } from "@/components/profile/UserFlair";
import { useTranslation } from "@/hooks/useTranslation";

interface ChatMsg {
  id: number;
  sender: { username: string; display_name: string; flair?: string };
  content: string;
}

/** Chat de club (REST) */
export function ClubChat({ slug }: { slug: string }) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!user) return;
    socialApi
      .chatHistory("club", slug)
      .then(({ data }) => setMessages(Array.isArray(data) ? data : data.results ?? []))
      .catch((err) => setError(formatApiError(err, t("chat.error.load"))));
  }, [user, slug, t]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || !user) return;
    try {
      await socialApi.sendChat("club", slug, msg);
      setText("");
      load();
    } catch (err) {
      setError(formatApiError(err, t("chat.error.send")));
    }
  };

  if (!user) {
    return <p className="text-xs opacity-60">{t("chat.loginRequired")}</p>;
  }

  return (
    <div className="glass-card flex flex-col h-[260px]">
      <h3 className="font-semibold text-sm p-3 border-b border-white/10">{t("clubs.chat")}</h3>
      {error && <p className="text-xs text-africhess-terracotta px-3">{error}</p>}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {messages.map((m) => (
          <div key={m.id}>
            <span className="font-medium text-africhess-gold inline-flex items-center gap-0.5">
              <UserFlair flair={m.sender.flair} />
              {m.sender.display_name || m.sender.username}:
            </span>{" "}
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-1 p-2 border-t border-white/10">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("chat.placeholder")}
          className="flex-1 text-sm px-2 py-1 rounded border bg-transparent"
          maxLength={500}
        />
        <button type="button" onClick={send} className="px-3 py-1 text-sm rounded-lg african-gradient text-white">
          →
        </button>
      </div>
    </div>
  );
}
