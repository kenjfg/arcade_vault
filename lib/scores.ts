// Client-only helpers over the "av_scores" localStorage key.

const STORAGE_KEY = "av_scores";

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

export function getScores(): SavedScore[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedScore[]) : [];
  } catch {
    return [];
  }
}

export function saveScore(entry: Omit<SavedScore, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const all = getScores();
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable (e.g. private mode) — score just won't persist.
  }
}
