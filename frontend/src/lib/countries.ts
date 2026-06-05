/** Pays africains pour filtres classement — aligné sur backend AFRICAN_COUNTRY_CODES. */
import { WORLD_COUNTRIES, countryName, type WorldCountry } from "./worldCountries";

export const AFRICAN_COUNTRIES: { code: string; name: string }[] = [
  { code: "", name: "Tous les pays" },
  ...WORLD_COUNTRIES.filter((c) => c.isAfrican)
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr"))
    .map((c) => ({ code: c.code, name: c.nameFr })),
];

export function getCountryByCode(code: string): WorldCountry | undefined {
  return WORLD_COUNTRIES.find((c) => c.code === code);
}

export function displayCountry(code: string, locale: string): string {
  const c = getCountryByCode(code);
  if (!c) return code;
  return countryName(c, locale);
}
