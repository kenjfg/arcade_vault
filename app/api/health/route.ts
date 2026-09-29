// Health check for the Supabase connection. Queries Auth's health endpoint,
// which validates both the project URL and the publishable key without
// depending on any table. Details go to the server log; the response only
// carries an error code.

type HealthResponse = { ok: true } | { ok: false; error: "missing_env" | "unauthorized" | "unreachable" };

// Never prerender or cache: every request must reach Supabase.
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;

function fail(error: "missing_env" | "unauthorized" | "unreachable") {
  return Response.json({ ok: false, error } satisfies HealthResponse, { status: 503 });
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    const missing = [!url && "NEXT_PUBLIC_SUPABASE_URL", !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean);
    console.error(`[health] missing env: ${missing.join(", ")}`);
    return fail("missing_env");
  }

  let res: Response;
  try {
    res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[health] request failed:", err);
    return fail("unreachable");
  }

  if (res.status === 401 || res.status === 403) {
    console.error(`[health] Supabase rejected the key (HTTP ${res.status})`);
    return fail("unauthorized");
  }
  if (res.status !== 200) {
    console.error(`[health] unexpected status from Supabase: HTTP ${res.status}`);
    return fail("unreachable");
  }

  return Response.json({ ok: true } satisfies HealthResponse);
}
