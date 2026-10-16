"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MIN_PASSWORD } from "@/components/register-form";
import { weakPasswordMessage } from "@/lib/auth-errors";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

type Field = "password" | "repeat";

// Reached from the "Reset password" email: /auth/confirm already started the
// recovery session, so updateUser() changes this account's password.
export default function NewPasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<Field, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors: Partial<Record<Field, string>> = {};
    if (password.length < MIN_PASSWORD)
      errors.password = `MÍNIMO ${MIN_PASSWORD} CARACTERES`;
    if (repeat !== password) errors.repeat = "LAS CONTRASEÑAS NO COINCIDEN";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSubmitting(false);
    if (!error) {
      router.push("/juegos");
      return;
    }
    const passwordError = weakPasswordMessage(error, MIN_PASSWORD);
    if (error.code === "same_password")
      setFormError("LA CONTRASEÑA NUEVA DEBE SER DISTINTA DE LA ANTERIOR");
    else if (passwordError) setFieldErrors({ password: passwordError });
    else setFormError("NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">NUEVA CONTRASEÑA</h2>
        </div>

        {loading ? null : !user ? (
          <>
            <div className="auth-msg error" role="alert">
              EL ENLACE NO ES VÁLIDO O HA CADUCADO
            </div>
            <Link
              href="/recuperar-contrasena"
              className="btn lg"
              style={{ width: "100%" }}
            >
              PEDIR OTRO ENLACE
            </Link>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="new-password">Nueva contraseña</label>
              <input
                id="new-password"
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
              <label htmlFor="new-password-repeat">Repetir contraseña</label>
              <input
                id="new-password-repeat"
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
              {submitting ? "GUARDANDO..." : "GUARDAR CONTRASEÑA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
