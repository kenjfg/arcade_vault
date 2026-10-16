import { isAuthWeakPasswordError, type AuthError } from "@supabase/supabase-js";

// SPEC 16: shared reading of Supabase Auth errors for the auth forms.

export const RATE_LIMIT_MESSAGE = "DEMASIADOS INTENTOS. ESPERA UNOS MINUTOS";
export const PWNED_PASSWORD_MESSAGE =
  "ESA CONTRASEÑA APARECE EN FILTRACIONES. ELIGE OTRA";

export function isRateLimitError(error: AuthError): boolean {
  return (
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit"
  );
}

// "pwned" only shows up once leaked password protection is on (Pro plan).
export function weakPasswordMessage(
  error: AuthError,
  min: number,
): string | null {
  if (!isAuthWeakPasswordError(error)) return null;
  if (error.reasons.includes("pwned")) return PWNED_PASSWORD_MESSAGE;
  return `MÍNIMO ${min} CARACTERES`;
}
