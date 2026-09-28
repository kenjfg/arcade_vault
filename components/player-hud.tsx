interface PlayerHudProps {
  playerName: string;
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
  onExit: () => void;
}

export function PlayerHud({ playerName, score, lives, level, paused, onTogglePause, onEnd, onExit }: PlayerHudProps) {
  return (
    <div className="player-hud">
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div className="hud-stat">
          <div className="l">Jugador</div>
          <div className="v" style={{ color: "var(--ink)" }}>
            {playerName}
          </div>
        </div>
        <div className="hud-stat">
          <div className="l">Puntuación</div>
          <div className="v">{score.toLocaleString("es-ES")}</div>
        </div>
        <div className="hud-stat lives">
          <div className="l">Vidas</div>
          <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
        </div>
        <div className="hud-stat level">
          <div className="l">Nivel</div>
          <div className="v">{String(level).padStart(2, "0")}</div>
        </div>
      </div>
      <div className="hud-actions">
        <button className="btn yellow" onClick={onTogglePause}>
          {paused ? "REANUDAR" : "PAUSA"}
        </button>
        <button className="btn magenta" onClick={onEnd}>
          FIN
        </button>
        <button className="btn ghost" onClick={onExit}>
          SALIR
        </button>
      </div>
    </div>
  );
}
