import { describe, expect, it } from "vitest";
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { formatApiError, isEmailAlreadyUsedError } from "./errors";

function axiosError(data: unknown, status = 400): AxiosError {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    {} as InternalAxiosRequestConfig,
    {},
    { status, data } as AxiosResponse
  );
}

describe("formatApiError", () => {
  it("returns fallback for non-axios errors", () => {
    expect(formatApiError(new Error("x"), "fallback")).toBe("fallback");
  });

  it("parses detail string", () => {
    const err = axiosError({ detail: "Identifiants incorrects." });
    expect(formatApiError(err)).toBe("Identifiants incorrects.");
  });

  it("maps expired token message", () => {
    const err = axiosError({ detail: "token not valid" }, 401);
    expect(formatApiError(err)).toBe("Session expirée. Réessayez de vous connecter.");
  });

  it("parses field errors", () => {
    const err = axiosError({ username: ["Ce champ est requis."] });
    expect(formatApiError(err)).toContain("Nom d'utilisateur");
  });
});

describe("isEmailAlreadyUsedError", () => {
  it("detects duplicate email", () => {
    const err = axiosError({ email: ["Cet e-mail est déjà utilisé."] });
    expect(isEmailAlreadyUsedError(err)).toBe(true);
  });
});
