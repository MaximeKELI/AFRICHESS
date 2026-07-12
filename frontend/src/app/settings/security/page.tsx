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
  const [password, setPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi.totpStatus().then(({ data }) => setEnabled(Boolean(data.totp_enabled))).catch(() => {});
  }, []);

  const setup = async () => {
    setError(null);
    try {
      const { data } = await usersApi.totpSetup(password);
      setSecret(data.secret);
      setUri(data.uri);
      setStatus(t("security.2fa.scan"));
    } catch (err) {
      setError(formatApiError(err, t("security.2fa.error")));
    }
  };

  const enable = async () => {
    try {
      await usersApi.totpEnable(code, password);
      setEnabled(true);
      setSecret(null);
      setStatus(t("security.2fa.enabled"));
    } catch (err) {
      setError(formatApiError(err, t("security.2fa.error")));
    }
  };

  const disable = async () => {
    try {
      await usersApi.totpDisable(code, password);
      setEnabled(false);
      setCode("");
      setStatus(t("security.2fa.disabled"));
    } catch (err) {
      setError(formatApiError(err, t("security.2fa.error")));
    }
  };

  const changePassword = async () => {
    setError(null);
    try {
      await usersApi.changePassword(oldPassword, newPassword1, newPassword2);
      setOldPassword("");
      setNewPassword1("");
      setNewPassword2("");
      setStatus(t("security.password.changed"));
    } catch (err) {
      setError(formatApiError(err, t("security.password.error")));
    }
  };

  const exportData = async () => {
    setError(null);
    try {
      const { data } = await usersApi.exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "africhess-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setStatus(t("security.export.done"));
    } catch (err) {
      setError(formatApiError(err, t("security.export.error")));
    }
  };

  const closeAccount = async () => {
    if (!window.confirm(t("security.close.confirm"))) return;
    setError(null);
    try {
      await usersApi.closeAccount(password);
      setStatus(t("security.close.done"));
      window.location.href = "/";
    } catch (err) {
      setError(formatApiError(err, t("security.close.error")));
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-8">
      <Link href="/profile" className="text-sm text-africhess-gold hover:underline">
        ← {t("security.back")}
      </Link>

      <section className="space-y-4">
        <h1 className="text-2xl font-bold">{t("security.2fa.title")}</h1>
        <p className="text-sm opacity-70">{t("security.2fa.desc")}</p>
        {status && <p className="text-sm text-africhess-green">{status}</p>}
        {error && <p className="text-sm text-africhess-terracotta">{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("security.password.current")}
          className="w-full px-3 py-2 rounded-lg border border-white/15 bg-transparent text-sm"
          autoComplete="current-password"
        />
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
      </section>

      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-lg font-semibold">{t("security.password.title")}</h2>
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          placeholder={t("security.password.current")}
          className="w-full px-3 py-2 rounded-lg border border-white/15 bg-transparent text-sm"
          autoComplete="current-password"
        />
        <input
          type="password"
          value={newPassword1}
          onChange={(e) => setNewPassword1(e.target.value)}
          placeholder={t("security.password.new")}
          className="w-full px-3 py-2 rounded-lg border border-white/15 bg-transparent text-sm"
          autoComplete="new-password"
        />
        <input
          type="password"
          value={newPassword2}
          onChange={(e) => setNewPassword2(e.target.value)}
          placeholder={t("security.password.confirm")}
          className="w-full px-3 py-2 rounded-lg border border-white/15 bg-transparent text-sm"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={changePassword}
          className="px-4 py-2 text-sm rounded-lg african-gradient text-white"
        >
          {t("security.password.submit")}
        </button>
      </section>

      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-lg font-semibold">{t("security.data.title")}</h2>
        <button type="button" onClick={exportData} className="px-4 py-2 text-sm rounded-lg border border-white/20">
          {t("security.export.button")}
        </button>
        <button
          type="button"
          onClick={closeAccount}
          className="block px-4 py-2 text-sm rounded-lg border border-africhess-terracotta text-africhess-terracotta"
        >
          {t("security.close.button")}
        </button>
      </section>
    </div>
  );
}
