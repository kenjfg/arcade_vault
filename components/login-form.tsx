"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authConfirmUrl, useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

type LoginError = "credentials" | "unconfirmed" | "network" | "link" | "oauth";

const ERROR_TEXT: Record<LoginError, string> = {
  credentials: "CORREO O CONTRASEÑA INCORRECTOS",
  unconfirmed: "CONFIRMA TU CORREO ANTES DE ENTRAR",
  network: "NO SE PUDO CONECTAR. INTÉNTALO DE NUEVO",
  link: "EL ENLACE NO ES VÁLIDO O HA CADUCADO",
  oauth: "NO SE PUDO INICIAR SESIÓN. INTÉNTALO DE NUEVO",
};

type OAuthProvider = "google" | "github";

type ResendState = "idle" | "sending" | "sent" | "failed";

interface LoginFormProps {
  // ?error= from the URL: "enlace" from /auth/confirm, "oauth" from /auth/callback.
  urlError: "enlace" | "oauth" | null;
}

const URL_ERRORS: Record<"enlace" | "oauth", LoginError> = {
  enlace: "link",
  oauth: "oauth",
};

export function LoginForm({ urlError }: LoginFormProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<LoginError | null>(
    urlError ? URL_ERRORS[urlError] : null,
  );
  const [resend, setResend] = useState<ResendState>("idle");
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);
  const redirected = useRef(false);

  // Signed in (already, or right after submitting): go to the library.
  useEffect(() => {
    if (loading || !user || redirected.current) return;
    redirected.current = true;
    router.replace("/juegos");
  }, [loading, user, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResend("idle");
    const { error: signInError } = await createClient().auth.signInWithPassword(
      { email, password },
    );
    setSubmitting(false);
    if (!signInError) {
      redirected.current = true;
      router.push("/juegos");
      return;
    }
    if (signInError.code === "invalid_credentials") setError("credentials");
    else if (signInError.code === "email_not_confirmed")
      setError("unconfirmed");
    else setError("network");
  };

  // Leaves for the provider; it comes back through /auth/callback.
  const signInWithProvider = async (provider: OAuthProvider) => {
    setOauthPending(provider);
    setError(null);
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/juegos`,
      },
    });
    if (oauthError) {
      setOauthPending(null);
      setError("network");
    }
  };

  const resendConfirmation = async () => {
    setResend("sending");
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: authConfirmUrl("email", "/juegos") },
    });
    setResend(resendError ? "failed" : "sent");
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="mark"></div>
        <h2 className="neon-cyan">INICIAR SESIÓN</h2>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
            marginTop: 6,
          }}
        >
          ACCESO AL SISTEMA · v2.6
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="login-email">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jugador@vault.gg"
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="auth-msg error" role="alert">
            {ERROR_TEXT[error]}
            {error === "unconfirmed" && (
              <button
                type="button"
                className="btn ghost"
                style={{ width: "100%", marginTop: 10 }}
                disabled={resend === "sending" || resend === "sent"}
                onClick={resendConfirmation}
              >
                {resend === "sending"
                  ? "ENVIANDO..."
                  : resend === "sent"
                    ? "CORREO REENVIADO"
                    : "REENVIAR CORREO"}
              </button>
            )}
            {resend === "failed" && (
              <div style={{ marginTop: 8 }}>
                NO SE PUDO REENVIAR. INTÉNTALO MÁS TARDE
              </div>
            )}
          </div>
        )}

        <button
          className="btn lg"
          type="submit"
          style={{ width: "100%", marginTop: 8 }}
          disabled={submitting}
        >
          {submitting ? "ENTRANDO..." : "ENTRAR AL VAULT"}
        </button>
      </form>

      <div
        className="mono"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          fontSize: 11,
          letterSpacing: "0.1em",
        }}
      >
        <Link href="/recuperar-contrasena" className="neon-cyan">
          ¿OLVIDASTE TU CONTRASEÑA?
        </Link>
        <Link href="/registro" className="neon-cyan">
          ¿NO TIENES CUENTA? CREAR CUENTA
        </Link>
      </div>

      <button
        className="btn ghost"
        style={{ width: "100%", marginTop: 10 }}
        onClick={() => router.push("/juegos")}
      >
        JUGAR COMO INVITADO
      </button>

      <div className="auth-divider">O CONTINÚA CON</div>
      <div className="social">
        <button
          className="btn ghost"
          type="button"
          disabled={oauthPending !== null}
          onClick={() => signInWithProvider("google")}
        >
          {oauthPending === "google" ? "CONECTANDO..." : "◆ GOOGLE"}
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={oauthPending !== null}
          onClick={() => signInWithProvider("github")}
        >
          {oauthPending === "github" ? "CONECTANDO..." : "▣ GITHUB"}
        </button>
      </div>

      <div
        style={{
          marginTop: 18,
          textAlign: "center",
          fontSize: 11,
          color: "var(--ink-faint)",
          letterSpacing: "0.1em",
        }}
      >
        AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
      </div>
    </div>
  );
}
