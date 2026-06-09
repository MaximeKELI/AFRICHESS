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
  const locale = getAppLocale();
  const fb = fallback ?? translate(locale, "common.error");

  if (!(error instanceof AxiosError)) {
    return fb;
  }

  if (!error.response) {
    return translate(locale, "errors.network");
  }

  if (error.response.status === 429) {
    return translate(locale, "errors.throttled");
  }

  const data = error.response.data;
  if (error.response.status === 404) {
    const path = error.config?.url ?? "";
    if (path.includes("/stats/")) {
      return translate(locale, "errors.stats404");
    }
  }

  if (!data) {
    return error.message || translate(locale, "errors.unknown");
  }

  if (typeof data === "string") {
    if (data.includes("<!DOCTYPE") || data.includes("<html")) {
      if (data.includes("users_userstats")) {
        return translate(locale, "errors.serverTechnical");
      }
      if (data.includes("email") || data.includes("username")) {
        return translate(locale, "errors.emailUsed");
      }
      if (data.includes("is_timed") || data.includes("time_control")) {
        return translate(locale, "errors.migration");
      }
      return translate(locale, "errors.serverGeneric");
    }
    return data;
  }

  const detailText = Array.isArray(data.detail)
    ? data.detail.join(" ")
    : typeof data.detail === "string"
      ? data.detail
      : "";
  if (detailText) {
    if (detailText.includes("Plusieurs comptes")) return detailText;
    if (
      detailText.includes("token not valid") ||
      detailText.includes("Token is invalid")
    ) {
      return translate(locale, "errors.sessionExpired");
    }
    if (
      detailText.includes("e-mail") ||
      detailText.includes("compte") ||
      detailText.includes("already")
    ) {
      return translate(locale, "errors.emailExists");
    }
    return detailText;
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
      messages.push(translate(locale, "errors.emailExists"));
      continue;
    }
    if (field === "username" && text.includes("déjà")) {
      messages.push(translate(locale, "errors.usernameTaken"));
      continue;
    }
    if (field === "non_field_errors") {
      messages.push(
        text.includes("log in") || text.includes("credentials")
          ? translate(locale, "errors.badCredentials")
          : text
      );
      continue;
    }
    const labelKey = FIELD_KEYS[field];
    const label = labelKey ? translate(locale, labelKey) : "";
    messages.push(label ? `${label} : ${text}` : text);
  }

  return messages.length > 0 ? messages.join(" ") : translate(locale, "errors.invalidRequest");
}

export function isEmailAlreadyUsedError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false;
  const data = error.response?.data;
  if (!data || typeof data !== "object") return false;
  const email = (data as { email?: string[] }).email;
  return Array.isArray(email) && email.some((m) => m.includes("déjà") || m.includes("already"));
}
