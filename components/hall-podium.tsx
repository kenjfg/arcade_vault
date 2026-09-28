import type { ScoreRow } from "@/lib/games-data";

interface HallPodiumProps {
  rows: ScoreRow[];
}

export function HallPodium({ rows }: HallPodiumProps) {
  const [first, second, third] = rows;
  if (!first || !second || !third) return null;

  return (
    <div className="podium">
      <div className="podium-slot silver">
        <div className="rank-num">02</div>
        <div className="name">{second.name}</div>
        <div className="score">{second.score.toLocaleString("es-ES")}</div>
        <div className="date">{second.date}</div>
      </div>
      <div className="podium-slot gold">
        <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>
          CAMPEÓN
        </div>
        <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
          01
        </div>
        <div className="name">{first.name}</div>
        <div className="score" style={{ fontSize: 20 }}>
          {first.score.toLocaleString("es-ES")}
        </div>
        <div className="date">{first.date}</div>
      </div>
      <div className="podium-slot bronze">
        <div className="rank-num">03</div>
        <div className="name">{third.name}</div>
        <div className="score">{third.score.toLocaleString("es-ES")}</div>
        <div className="date">{third.date}</div>
      </div>
    </div>
  );
}
