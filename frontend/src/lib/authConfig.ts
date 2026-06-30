/** HttpOnly refresh cookie — activé via NEXT_PUBLIC_JWT_REFRESH_HTTPONLY=true */
export const JWT_REFRESH_HTTPONLY =
  process.env.NEXT_PUBLIC_JWT_REFRESH_HTTPONLY === "true";
