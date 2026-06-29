"use client";

import { useEffect, useState } from "react";
import { usersApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi.totpStatus().then(({ data }) => setEnabled(Boolean(data.totp_enabled))).catch(() => {});
  }, []);

  const setup = async () => {
    setError(null);
    try {
      const { data } = await usersApi.totpSetup();
      setSecret(data.secret);
      setUri(data.uri);
      setStatus(t("security.2fa.scan"));
    } catch (err) {
      setError(formatApiError(err, t("security.2fa.error")));
    }
  };

  const enable = async () => {
    try {
      await usersApi.totpEnable(code);
      setEnabled(true);
      setSecret(null);
      setStatus(t("security.2fa.enabled"));
    } catch (err) {
      setError(formatApiError(err, t("security.2fa.error")));
    }
  };

  const disable = async () => {
    try {
      await usersApi.totpDisable(code);
      setEnabled(false);
      setCode("");
      setStatus(t("security.2fa.disabled"));
    } catch (err) {
      setError(formatApiError(err, t("security.2fa.error")));
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <Link href="/profile" className="text-sm text-africhess-gold hover:underline">
        ← {t("security.back")}
      </Link>
      <h1 className="text-2xl font-bold">{t("security.2fa.title")}</h1>
      <p className="text-sm opacity-70">{t("security.2fa.desc")}</p>
      {status && <p className="text-sm text-africhess-green">{status}</p>}
      {error && <p className="text-sm text-africhess-terracotta">{error}</p>}
      {secret && (
        <div className="glass-card p-4 text-xs space-y-2 break-all">
          <p className="font-mono">{secret}</p>
          {uri && <p className="opacity-60">{uri}</p>}
        </div>
      )}
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        className="w-full text-center text-lg tracking-widest p-3 rounded-lg border border-white/15 bg-transparent"
        inputMode="numeric"
      />
      {!enabled ? (
        <div className="flex gap-2">
          <button type="button" onClick={setup} className="px-4 py-2 text-sm rounded-lg border border-white/20">
            {t("security.2fa.setup")}
          </button>
          <button
            type="button"
            onClick={enable}
            disabled={code.length !== 6}
            className="px-4 py-2 text-sm rounded-lg african-gradient text-white disabled:opacity-50"
          >
            {t("security.2fa.enable")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={disable}
          disabled={code.length !== 6}
          className="px-4 py-2 text-sm rounded-lg border border-africhess-terracotta text-africhess-terracotta disabled:opacity-50"
        >
          {t("security.2fa.disable")}
        </button>
      )}
    </div>
  );
}
