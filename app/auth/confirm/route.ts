import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Target of the links in the "Confirm signup" and "Reset password" emails
// (see the templates in SPEC 14). Verifies the token_hash, which starts the
// session through the cookies, and redirects to `next`.

const ALLOWED_TYPES = ["email", "recovery"] as const;
type ConfirmType = (typeof ALLOWED_TYPES)[number];

const DEFAULT_NEXT = "/juegos";

function isConfirmType(value: string | null): value is ConfirmType {
  return ALLOWED_TYPES.includes(value as ConfirmType);
}

// Only internal paths: an absolute URL or a protocol-relative "//host" would
// turn this route into an open redirect.
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_NEXT;
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));

  if (tokenHash && isConfirmType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("[auth/confirm] verifyOtp failed:", error.message);
  }

  return NextResponse.redirect(new URL("/iniciar-sesion?error=enlace", request.url));
}
