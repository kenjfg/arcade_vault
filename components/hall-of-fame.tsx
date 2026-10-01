"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HallPodium } from "@/components/hall-podium";
import { HallTable } from "@/components/hall-table";
import { formatScoreDate, type Game, type ScoreRow } from "@/lib/games-data";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

interface HallOfFameProps {
  games: Pick<Game, "id" | "code" | "title">[];
  game: Pick<Game, "id" | "code" | "title">;
  // null when the ranking could not be read.
  rows: ScoreRow[] | null;
}

export function HallOfFame({ games, game, rows }: HallOfFameProps) {
  const { user } = useAuth();
  // Scores are saved trimmed and uppercased (submitScore), so match the same way.
  const name = user ? user.name.trim().toUpperCase() : null;
  const youKey = name ? `${game.id}:${name}` : null;

  // The simulated user only exists in the browser, so the "TÚ" row is read here.
  // The result is tagged with its key so a stale answer is never shown for another game or user.
  const [you, setYou] = useState<{ key: string; row: ScoreRow | null } | null>(
    null,
  );

  useEffect(() => {
    if (!youKey || !name || rows === null) return;
    let cancelled = false;
    createClient()
      .from("leaderboard")
      .select("rank, name, score, created_at")
      .eq("game_id", game.id)
      .eq("name", name)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[hall] you row:", error.message);
        setYou({
          key: youKey,
          row: data
            ? {
                rank: data.rank ?? 0,
                name: data.name ?? name,
                score: data.score ?? 0,
                date: formatScoreDate(data.created_at),
              }
            : null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [youKey, name, game.id, rows]);

  const youRow = you && you.key === youKey ? you.row : null;

  return (
    <>
      <div className="hall-tabs">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon-de-la-fama?juego=${g.code}`}
            scroll={false}
            className={"chip" + (g.id === game.id ? " active" : "")}
          >
            {g.title}
          </Link>
        ))}
      </div>

      {rows === null ? (
        <div className="hall-table">
          <div className="lb-empty error">RANKING NO DISPONIBLE</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="hall-table">
          <div className="lb-empty">SÉ EL PRIMERO EN ENTRAR AL SALÓN</div>
        </div>
      ) : (
        <>
          <HallPodium rows={rows} />
          <HallTable rows={rows} gameTitle={game.title} you={youRow} />
        </>
      )}
    </>
  );
}
