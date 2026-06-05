import { AxiosError } from "axios";

const FIELD_LABELS: Record<string, string> = {
  email: "E-mail",
  username: "Nom d'utilisateur",
  password: "Mot de passe",
  password_confirm: "Confirmation",
  non_field_errors: "",
  detail: "",
};

export function formatApiError(
  error: unknown,
  fallback = "Une erreur est survenue."
): string {
  if (!(error instanceof AxiosError)) {
    return fallback;
  }

  if (!error.response) {
    return (
      "Impossible de joindre le serveur (API port 8000). " +
      "Vérifiez que le backend tourne : docker start africhess-backend-1"
    );
  }

  const data = error.response.data;
  if (!data) {
    return error.message || "Erreur inconnue.";
  }

  if (typeof data === "string") {
    if (data.includes("<!DOCTYPE") || data.includes("<html")) {
      if (data.includes("users_userstats")) {
        return "Erreur technique serveur. Redémarrez le backend puis réessayez.";
      }
      if (data.includes("email") || data.includes("username")) {
        return "Compte ou e-mail déjà utilisé — utilisez la page Connexion.";
      }
      if (data.includes("is_timed") || data.includes("time_control")) {
        return (
          "Base de données à mettre à jour. Lancez : docker exec africhess-backend-1 " +
          "python manage.py migrate puis redémarrez le backend."
        );
      }
      return "Erreur serveur. Redémarrez le backend (docker start africhess-backend-1).";
    }
    return data;
  }

  if (typeof data.detail === "string") {
    if (data.detail.includes("Plusieurs comptes")) return data.detail;
    if (
      data.detail.includes("token not valid") ||
      data.detail.includes("Token is invalid")
    ) {
      return "Session expirée. Réessayez de vous connecter.";
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
      messages.push("Cet e-mail a déjà un compte → connectez-vous.");
      continue;
    }
    if (field === "username" && text.includes("déjà")) {
      messages.push("Ce nom d'utilisateur est déjà pris.");
      continue;
    }
    if (field === "non_field_errors") {
      messages.push(
        text.includes("log in") || text.includes("credentials")
          ? "Identifiants incorrects."
          : text
      );
      continue;
    }
    const label = FIELD_LABELS[field];
    messages.push(label ? `${label} : ${text}` : text);
  }

  return messages.length > 0 ? messages.join(" ") : "Requête invalide.";
}

export function isEmailAlreadyUsedError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false;
  const data = error.response?.data;
  if (!data || typeof data !== "object") return false;
  const email = (data as { email?: string[] }).email;
  return Array.isArray(email) && email.some((m) => m.includes("déjà"));
}
