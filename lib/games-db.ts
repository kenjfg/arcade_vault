// Server-side reads of the game catalog and leaderboards from Supabase.
// Uses the server client, so only import this from Server Components or Server Functions.

import { createClient } from "@/lib/supabase/server";
import {
  formatScoreDate,
  type Category,
  type Game,
  type GameColor,
  type GameWithStats,
  type ScoreRow,
} from "@/lib/games-data";

const GAME_COLUMNS =
  "id, code, title, short_desc, long_desc, cover, color, playable, category:categories!inner(id, code, name)";

interface GameRow {
  id: number;
  code: string;
  title: string;
  short_desc: string;
  long_desc: string;
  cover: string;
  color: string;
  playable: boolean;
  category: Category;
}

type Stats = Map<number, { plays: number; best: number }>;

function toGame(row: GameRow): Game {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    short: row.short_desc,
    long: row.long_desc,
    category: row.category,
    cover: row.cover,
    // The table's CHECK constraint guarantees one of the GameColor values.
    color: row.color as GameColor,
    playable: row.playable,
  };
}

function withStats(game: Game, stats: Stats | null): GameWithStats {
  const s = stats?.get(game.id);
  return { ...game, plays: s?.plays ?? 0, best: s?.best ?? 0 };
}

// null means the stats could not be read; callers show "RANKING NO DISPONIBLE".
async function readStats(gameId?: number): Promise<Stats | null> {
  const supabase = await createClient();
  let query = supabase.from("game_stats").select("game_id, plays, best");
  if (gameId !== undefined) query = query.eq("game_id", gameId);
  const { data, error } = await query;
  if (error) {
    console.error("[games] game_stats:", error.message);
    return null;
  }
  const stats: Stats = new Map();
  for (const row of data) {
    if (row.game_id !== null)
      stats.set(row.game_id, { plays: row.plays ?? 0, best: row.best ?? 0 });
  }
  return stats;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, code, name")
    .order("sort_order");
  if (error) throw new Error(`[games] categories: ${error.message}`);
  return data;
}

export async function getGames(): Promise<{
  games: GameWithStats[];
  statsError: boolean;
}> {
  const supabase = await createClient();
  const [{ data, error }, stats] = await Promise.all([
    supabase
      .from("games")
      .select(GAME_COLUMNS)
      .order("sort_order")
      .overrideTypes<GameRow[], { merge: false }>(),
    readStats(),
  ]);
  if (error) throw new Error(`[games] games: ${error.message}`);
  return {
    games: data.map((row) => withStats(toGame(row), stats)),
    statsError: stats === null,
  };
}

// null when no game has that code (the page calls notFound()).
export async function getGame(
  code: string,
): Promise<{ game: GameWithStats; statsError: boolean } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("code", code)
    .overrideTypes<GameRow[], { merge: false }>();
  if (error) throw new Error(`[games] game "${code}": ${error.message}`);
  if (data.length === 0) return null;

  const game = toGame(data[0]);
  const stats = await readStats(game.id);
  return { game: withStats(game, stats), statsError: stats === null };
}

export async function getLeaderboard(
  gameId: number,
  limit: number,
): Promise<{ rows: ScoreRow[] } | { error: true }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("rank, name, score, created_at")
    .eq("game_id", gameId)
    .order("rank")
    .limit(limit);
  if (error) {
    console.error("[games] leaderboard:", error.message);
    return { error: true };
  }
  return {
    rows: data.map((row) => ({
      rank: row.rank ?? 0,
      name: row.name ?? "",
      score: row.score ?? 0,
      date: formatScoreDate(row.created_at),
    })),
  };
}
