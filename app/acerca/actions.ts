"use server";

import { Resend } from "resend";

export type ContactState =
  | { status: "idle" }
  | { status: "sent"; name: string }
  | { status: "invalid" }
  | { status: "error" };

const MAX_NAME = 60;
const MAX_EMAIL = 254;
const MAX_MSG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendContactMessage(_prevState: ContactState, formData: FormData): Promise<ContactState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const msg = field(formData, "msg");

  // Honeypot: only bots fill the hidden "website" field. Pretend success, send nothing.
  if (field(formData, "website")) {
    console.warn("[contact] honeypot");
    return { status: "sent", name };
  }

  if (
    !name ||
    !email ||
    !msg ||
    name.length > MAX_NAME ||
    email.length > MAX_EMAIL ||
    msg.length > MAX_MSG ||
    !EMAIL_RE.test(email)
  ) {
    return { status: "invalid" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const missing = [!apiKey && "RESEND_API_KEY", !to && "CONTACT_TO_EMAIL"].filter(Boolean);
  if (!apiKey || !to) {
    console.error(`[contact] missing env: ${missing.join(", ")}`);
    return { status: "error" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}\n`,
    });
    if (error) {
      console.error("[contact] resend error:", error);
      return { status: "error" };
    }
  } catch (err) {
    console.error("[contact] resend request failed:", err);
    return { status: "error" };
  }

  return { status: "sent", name };
}
