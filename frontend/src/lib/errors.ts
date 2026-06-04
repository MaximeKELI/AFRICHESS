import { AxiosError } from "axios";

export function formatApiError(error: unknown): string {
  if (!(error instanceof AxiosError)) {
    return "Une erreur est survenue.";
  }
  const data = error.response?.data;
  if (!data) {
    return error.message || "Impossible de contacter le serveur.";
  }
  if (typeof data === "string") return data;
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
