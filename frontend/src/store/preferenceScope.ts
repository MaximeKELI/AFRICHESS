/** Scope utilisateur pour les clés localStorage — fichier isolé pour éviter les imports circulaires. */

let scopeUserId: number | null = null;

export function getPreferenceScopeUserId(): number | null {
  return scopeUserId;
}

export function setPreferenceScopeUserId(userId: number | null) {
  scopeUserId = userId;
}

export function preferenceStorageKey(base: string): string {
  return scopeUserId != null ? `${base}:user:${scopeUserId}` : `${base}:guest`;
}
