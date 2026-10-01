"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitScoreResult =
  | { ok: true }
  | { ok: false; error: "invalid_game" | "invalid_name" | "invalid_score" | "db_error" };

const MAX_SCORE = 10_000_000;

// Saves a score for a playable game. Anyone can call this (there is no real auth
// yet), so every value is re-checked here and again by the table's CHECKs and RLS.
export async function submitScore(input: { gameId: number; name: string; score: number }): Promise<SubmitScoreResult> {
  const name = typeof input.name === "string" ? input.name.trim().toUpperCase() : "";
  // Count code points, like Postgres char_length().
  const nameLength = [...name].length;
  if (nameLength < 1 || nameLength > 10) return { ok: false, error: "invalid_name" };

  if (!Number.isInteger(input.score) || input.score < 0 || input.score > MAX_SCORE) {
    return { ok: false, error: "invalid_score" };
  }
  if (!Number.isInteger(input.gameId)) return { ok: false, error: "invalid_game" };

  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("code, playable")
    .eq("id", input.gameId)
    .maybeSingle();
  if (gameError) {
    console.error("[scores] read game:", gameError.message);
    return { ok: false, error: "db_error" };
  }
  if (!game || !game.playable) return { ok: false, error: "invalid_game" };

  const { error: insertError } = await supabase
    .from("scores")
    .insert({ game_id: input.gameId, name, score: input.score });
  if (insertError) {
    console.error("[scores] insert:", insertError.message);
    return { ok: false, error: "db_error" };
  }

  revalidatePath(`/juegos/${game.code}`);
  revalidatePath("/juegos");
  revalidatePath("/");
  revalidatePath("/salon-de-la-fama");
  return { ok: true };
}
