import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Where Google and GitHub sign in come back (SPEC 15). OAuth uses PKCE and always
// returns to the browser that started it, so the code can be exchanged for a
// session here; the session lands in the cookies.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // `error` comes back when the user cancels on the provider's screen.
  const providerError = searchParams.get("error");
  if (providerError) {
    console.error("[auth/callback] provider error:", providerError, searchParams.get("error_description"));
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  }

  return NextResponse.redirect(new URL("/iniciar-sesion?error=oauth", request.url));
}
