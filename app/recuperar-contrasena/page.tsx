"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authConfirmUrl } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // The answer is the same whether the email has an account or not, so the
    // page never reveals which emails are registered.
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: authConfirmUrl("recovery", "/nueva-contrasena"),
    });
    setSubmitting(false);
    setSent(true);
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">RECUPERAR CONTRASEÑA</h2>
        </div>

        {sent ? (
          <div className="auth-msg ok" role="status">
            SI EL CORREO EXISTE, TE HEMOS ENVIADO UN ENLACE
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="recover-email">Correo electrónico</label>
              <input
                id="recover-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
              />
            </div>
            <button
              className="btn lg"
              type="submit"
              style={{ width: "100%", marginTop: 8 }}
              disabled={submitting}
            >
              {submitting ? "ENVIANDO..." : "ENVIAR ENLACE"}
            </button>
          </form>
        )}

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
            VOLVER A INICIAR SESIÓN
          </Link>
        </div>
      </div>
    </div>
  );
}
