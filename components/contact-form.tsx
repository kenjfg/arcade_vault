"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { sendContactMessage, type ContactState } from "@/app/acerca/actions";

const EMPTY_FORM = { name: "", email: "", msg: "" };
const IDLE: ContactState = { status: "idle" };

export function ContactForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [shake, setShake] = useState(false);
  // The last result the player closed ("ENVIAR OTRO MENSAJE" / "REINTENTAR"); it stops showing
  // until the next submit returns a new state object.
  const [dismissed, setDismissed] = useState<ContactState>(IDLE);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const [state, submit, pending] = useActionState(async (prev: ContactState, formData: FormData) => {
    const next = await sendContactMessage(prev, formData);
    if (next.status === "invalid") triggerShake();
    return next;
  }, IDLE);

  const result = state === dismissed ? IDLE : state;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      triggerShake();
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(() => submit(formData));
  };

  const sendAnother = () => {
    setDismissed(state);
    setForm(EMPTY_FORM);
  };

  const retry = () => setDismissed(state);

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
      {result.status !== "sent" && result.status !== "error" ? (
        <>
          <div className="field">
            <label>NOMBRE</label>
            <input
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label>CORREO ELECTRÓNICO</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>MENSAJE</label>
            <textarea
              rows={5}
              name="msg"
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          {/* Honeypot: hidden from people, filled by bots */}
          <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
            <label>
              WEBSITE
              <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>
          <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={pending}>
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className={"terminal-success" + (result.status === "error" ? " is-error" : "")}>
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          {result.status === "sent" ? (
            <div className="term-body">
              <div className="line">
                <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
              </div>
              <div className="line dim">[OK] Conectando con servidor…</div>
              <div className="line dim">[OK] Validando contenido…</div>
              <div className="line dim">[OK] Transmitiendo paquete…</div>
              <div className="line success">
                &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {result.name.toUpperCase()}.
                <span className="caret">_</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <button className="btn ghost" type="button" onClick={sendAnother}>
                  ENVIAR OTRO MENSAJE
                </button>
              </div>
            </div>
          ) : (
            <div className="term-body">
              <div className="line">
                <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
              </div>
              <div className="line dim">[OK] Conectando con servidor…</div>
              <div className="line error">[ERROR] No se pudo transmitir el paquete.</div>
              <div className="line success error">
                &gt; MENSAJE NO ENVIADO. INTÉNTALO DE NUEVO EN UNOS MINUTOS.<span className="caret">_</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <button className="btn ghost" type="button" onClick={retry}>
                  REINTENTAR
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
