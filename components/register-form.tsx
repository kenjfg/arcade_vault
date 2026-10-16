"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authConfirmUrl, useAuth } from "@/lib/auth-context";
import {
  isRateLimitError,
  RATE_LIMIT_MESSAGE,
  weakPasswordMessage,
} from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

// Same rule as the profiles.username check constraint.
const USERNAME_RE = /^[A-Z0-9_]{3,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

const USERNAME_TAKEN = "ESE NOMBRE YA ESTÁ EN USO";
const SIGNUP_FAILED = "NO SE PUDO CREAR LA CUENTA. INTÉNTALO DE NUEVO";

type Field = "username" | "email" | "password" | "repeat";
type FieldErrors = Partial<Record<Field, string>>;
type ResendState = "idle" | "sending" | "sent" | "failed" | "rate";

function validate(
  username: string,
  email: string,
  password: string,
  repeat: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!USERNAME_RE.test(username))
    errors.username = "DE 3 A 10 CARACTERES: LETRAS, NÚMEROS O _";
  if (!EMAIL_RE.test(email)) errors.email = "CORREO NO VÁLIDO";
  if (password.length < MIN_PASSWORD)
    errors.password = `MÍNIMO ${MIN_PASSWORD} CARACTERES`;
  if (repeat !== password) errors.repeat = "LAS CONTRASEÑAS NO COINCIDEN";
  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resend, setResend] = useState<ResendState>("idle");
  const redirected = useRef(false);

  // Already signed in: there is nothing to register.
  useEffect(() => {
    if (loading || !user || redirected.current) return;
    redirected.current = true;
    router.replace("/juegos");
  }, [loading, user, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors = validate(username, email, password, repeat);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const supabase = createClient();
    const { data: available, error: rpcError } = await supabase.rpc(
      "username_available",
      { p_username: username },
    );
    if (rpcError) {
      setSubmitting(false);
      setFormError(SIGNUP_FAILED);
      return;
    }
    if (!available) {
      setSubmitting(false);
      setFieldErrors({ username: USERNAME_TAKEN });
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: authConfirmUrl("email", "/juegos"),
      },
    });
    setSubmitting(false);
    if (!signUpError) {
      setSentTo(email);
      return;
    }
    const passwordError = weakPasswordMessage(signUpError, MIN_PASSWORD);
    // The profiles trigger failed: another signup took the name since the check.
    if (signUpError.message.includes("Database error saving new user")) {
      setFieldErrors({ username: USERNAME_TAKEN });
    } else if (passwordError) {
      setFieldErrors({ password: passwordError });
    } else if (isRateLimitError(signUpError)) {
      setFormError(RATE_LIMIT_MESSAGE);
    } else {
      setFormError(SIGNUP_FAILED);
    }
  };

  const resendConfirmation = async () => {
    if (!sentTo) return;
    setResend("sending");
    const { error } = await createClient().auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: authConfirmUrl("email", "/juegos") },
    });
    if (!error) setResend("sent");
    else setResend(isRateLimitError(error) ? "rate" : "failed");
  };

  const header = (
    <div className="auth-header">
      <div className="mark"></div>
      <h2 className="neon-cyan">
        {sentTo ? "REVISA TU CORREO" : "CREAR CUENTA"}
      </h2>
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--ink-faint)",
          letterSpacing: "0.16em",
          marginTop: 6,
        }}
      >
        NUEVO JUGADOR · v2.6
      </div>
    </div>
  );

  if (sentTo) {
    return (
      <div className="auth-card">
        {header}
        <div className="auth-msg ok">
          TE HEMOS ENVIADO UN ENLACE DE CONFIRMACIÓN A {sentTo}. PÚLSALO PARA
          ACTIVAR TU CUENTA.
        </div>
        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%" }}
          disabled={resend === "sending" || resend === "sent"}
          onClick={resendConfirmation}
        >
          {resend === "sending"
            ? "ENVIANDO..."
            : resend === "sent"
              ? "CORREO REENVIADO"
              : "REENVIAR CORREO"}
        </button>
        {(resend === "failed" || resend === "rate") && (
          <div
            className="auth-msg error"
            role="alert"
            style={{ marginTop: 12 }}
          >
            {resend === "rate"
              ? RATE_LIMIT_MESSAGE
              : "NO SE PUDO REENVIAR. INTÉNTALO MÁS TARDE"}
          </div>
        )}
        <Link
          href="/iniciar-sesion"
          className="btn lg"
          style={{ width: "100%", marginTop: 12 }}
        >
          IR A INICIAR SESIÓN
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      {header}

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="register-username">Nombre de jugador</label>
          <input
            id="register-username"
            autoComplete="username"
            maxLength={10}
            value={username}
            onChange={(e) => setUsername(e.target.value.toUpperCase())}
            placeholder="PX_KAI"
            aria-invalid={!!fieldErrors.username}
          />
          {fieldErrors.username && (
            <div className="field-error">{fieldErrors.username}</div>
          )}
        </div>
        <div className="field">
          <label htmlFor="register-email">Correo electrónico</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jugador@vault.gg"
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && (
            <div className="field-error">{fieldErrors.email}</div>
          )}
        </div>
        <div className="field">
          <label htmlFor="register-password">Contraseña</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && (
            <div className="field-error">{fieldErrors.password}</div>
          )}
        </div>
        <div className="field">
          <label htmlFor="register-repeat">Repetir contraseña</label>
          <input
            id="register-repeat"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            placeholder="••••••••"
            aria-invalid={!!fieldErrors.repeat}
          />
          {fieldErrors.repeat && (
            <div className="field-error">{fieldErrors.repeat}</div>
          )}
        </div>

        {formError && (
          <div className="auth-msg error" role="alert">
            {formError}
          </div>
        )}

        <button
          className="btn lg"
          type="submit"
          style={{ width: "100%", marginTop: 8 }}
          disabled={submitting}
        >
          {submitting ? "CREANDO..." : "CREAR CUENTA"}
        </button>
      </form>

      <div
        className="mono"
        style={{
          marginTop: 14,
          textAlign: "center",
          fontSize: 11,
          letterSpacing: "0.1em",
        }}
      >
        <Link href="/iniciar-sesion" className="neon-cyan">
          ¿YA TIENES CUENTA? INICIAR SESIÓN
        </Link>
      </div>
    </div>
  );
}
