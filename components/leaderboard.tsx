import type { ScoreRow } from "@/lib/games-data";

interface LeaderboardProps {
  // null when the ranking could not be read.
  scores: ScoreRow[] | null;
}

export function Leaderboard({ scores }: LeaderboardProps) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {scores === null ? (
        <div className="lb-empty error">RANKING NO DISPONIBLE</div>
      ) : scores.length === 0 ? (
        <div className="lb-empty">SÉ EL PRIMERO EN ENTRAR AL SALÓN</div>
      ) : (
        scores.map((r, i) => (
          <div
            key={r.name}
            className={
              "lb-row" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.name}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                {r.date}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
