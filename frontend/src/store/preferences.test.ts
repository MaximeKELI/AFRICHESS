import { describe, expect, it, beforeEach } from "vitest";
import { preferenceStorageKey, syncPreferencesForUser } from "./preferences";

describe("preferenceStorageKey", () => {
  beforeEach(() => {
    syncPreferencesForUser(null);
  });

  it("scopes keys per user id", () => {
    syncPreferencesForUser(42);
    expect(preferenceStorageKey("board_background")).toBe("board_background:user:42");
    syncPreferencesForUser(99);
    expect(preferenceStorageKey("board_background")).toBe("board_background:user:99");
  });

  it("uses guest scope when logged out", () => {
    syncPreferencesForUser(null);
    expect(preferenceStorageKey("board_background")).toBe("board_background:guest");
  });
});
