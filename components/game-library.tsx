"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GameCard } from "@/components/game-card";
import type { Category, GameWithStats } from "@/lib/games-data";

interface GameLibraryProps {
  games: GameWithStats[];
  categories: Category[];
}

export function GameLibrary({ games, categories }: GameLibraryProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  // null = TODOS, which is a filter and not a row of the categories table.
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return games.filter(
      (g) =>
        (categoryId === null || g.category.id === categoryId) &&
        g.title.toLowerCase().includes(q.toLowerCase()),
    );
  }, [games, q, categoryId]);

  const goToDetail = (game: GameWithStats) => {
    router.push(`/juegos/${game.code}`);
  };

  return (
    <>
      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          <button
            className={"chip" + (categoryId === null ? " active" : "")}
            onClick={() => setCategoryId(null)}
          >
            TODOS
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={"chip" + (categoryId === c.id ? " active" : "")}
              onClick={() => setCategoryId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} onSelect={goToDetail} />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 80,
              color: "var(--ink-faint)",
            }}
          >
            <div
              className="pixel"
              style={{
                fontSize: 14,
                color: "var(--magenta)",
                marginBottom: 12,
              }}
            >
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </>
  );
}
