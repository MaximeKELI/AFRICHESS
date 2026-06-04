import { AxiosError } from "axios";

export function formatApiError(error: unknown): string {
  if (!(error instanceof AxiosError)) {
    return "Une erreur est survenue.";
  }
  const data = error.response?.data;
  if (!data) {
    return error.message || "Impossible de contacter le serveur.";
  }
  if (typeof data === "string") {
    if (data.includes("<!DOCTYPE") || data.includes("<html")) {
      if (data.includes("users_userstats")) {
        return "Erreur serveur à l'inscription. Contactez l'admin ou redémarrez le backend.";
      }
      if (data.includes("IntegrityError") && data.includes("username")) {
        return "Ce nom d'utilisateur est déjà pris.";
      }
      if (data.includes("IntegrityError") && data.includes("email")) {
        return "Cet e-mail est déjà utilisé — connectez-vous.";
      }
      return "Erreur serveur. Réessayez dans un instant.";
    }
    return data;
  }
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data)) return data.join(" ");
  const messages: string[] = [];
  for (const [field, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      messages.push(`${field}: ${value.join(", ")}`);
    } else if (typeof value === "string") {
      messages.push(value);
    }
  }
  return messages.length > 0 ? messages.join(" · ") : "Requête invalide.";
}
