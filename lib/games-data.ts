// Shared types for the game catalog and leaderboards. The data itself lives in
// Supabase and is read through lib/games-db.ts.

export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Category {
  id: number;
  code: string; // "arcade"
  name: string; // "ARCADE"
}

export interface Game {
  id: number;
  code: string; // "asteroids", used in URLs
  title: string;
  short: string;
  long: string;
  category: Category;
  cover: string;
  color: GameColor;
  playable: boolean;
}

export interface GameWithStats extends Game {
  plays: number;
  best: number;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa
}

const scoreDateFormat = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

// Shared by the server (lib/games-db.ts) and the Hall of Fame's "TÚ" row in the browser.
export function formatScoreDate(createdAt: string | null): string {
  return createdAt ? scoreDateFormat.format(new Date(createdAt)) : "";
}
