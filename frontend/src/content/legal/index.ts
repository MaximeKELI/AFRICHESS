import type { LegalDocument } from "./types";
import { PRIVACY_FR } from "./privacy-fr";
import { PRIVACY_EN } from "./privacy-en";

export function getPrivacyPolicy(locale: string): LegalDocument {
  if (locale === "en") return PRIVACY_EN;
  return PRIVACY_FR; // default fr for ar/pt/sw too until translated
}
