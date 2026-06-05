import { AxiosError } from "axios";
import { translate } from "./i18n";
import { getAppLocale } from "./i18n/labels";

const FIELD_KEYS: Record<string, string> = {
  email: "errors.field.email",
  username: "errors.field.username",
  password: "errors.field.password",
  password_confirm: "errors.field.passwordConfirm",
};

export function formatApiError(
  error: unknown,
  fallback?: string
): string {
  const locale = getLocale();
  const fb = fallback ?? tr("common.error", locale);

  if (!(error instanceof AxiosError)) {
    return fb;
  }

  if (!error.response) {
    return tr("errors.network", locale);
  }

  const data = error.response.data;
  if (error.response.status === 404) {
    const path = error.config?.url ?? "";
    if (path.includes("/stats/")) {
      return tr("errors.stats404", locale);
    }
  }

  if (!data) {
    return error.message || tr("errors.unknown", locale);
  }

  if (typeof data === "string") {
    if (data.includes("<!DOCTYPE") || data.includes("<html")) {
      if (data.includes("users_userstats")) {
        return tr("errors.serverTechnical", locale);
      }
      if (data.includes("email") || data.includes("username")) {
        return tr("errors.emailUsed", locale);
      }
      if (data.includes("is_timed") || data.includes("time_control")) {
        return tr("errors.migration", locale);
      }
      return tr("errors.serverGeneric", locale);
    }
    return data;
  }

  if (typeof data.detail === "string") {
    if (data.detail.includes("Plusieurs comptes")) return data.detail;
    if (
      data.detail.includes("token not valid") ||
      data.detail.includes("Token is invalid")
    ) {
      return tr("errors.sessionExpired", locale);
    }
    return data.detail;
  }

  if (Array.isArray(data)) return data.join(" ");

  const messages: string[] = [];
  for (const [field, value] of Object.entries(data as Record<string, unknown>)) {
    const text = Array.isArray(value)
      ? value.join(", ")
      : typeof value === "string"
        ? value
        : "";
    if (!text) continue;
    if (field === "email" && text.includes("déjà")) {
      messages.push(tr("errors.emailExists", locale));
      continue;
    }
    if (field === "username" && text.includes("déjà")) {
      messages.push(tr("errors.usernameTaken", locale));
      continue;
    }
    if (field === "non_field_errors") {
      messages.push(
        text.includes("log in") || text.includes("credentials")
          ? tr("errors.badCredentials", locale)
          : text
      );
      continue;
    }
    const labelKey = FIELD_KEYS[field];
    const label = labelKey ? tr(labelKey, locale) : "";
    messages.push(label ? `${label} : ${text}` : text);
  }

  return messages.length > 0 ? messages.join(" ") : tr("errors.invalidRequest", locale);
}

export function isEmailAlreadyUsedError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false;
  const data = error.response?.data;
  if (!data || typeof data !== "object") return false;
  const email = (data as { email?: string[] }).email;
  return Array.isArray(email) && email.some((m) => m.includes("déjà") || m.includes("already"));
}
