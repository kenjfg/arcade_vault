interface GameOverModalProps {
  score: number;
  name: string;
  saved: boolean;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onRestart: () => void;
  onBackToLibrary: () => void;
}

export function GameOverModal({ score, name, saved, onNameChange, onSave, onRestart, onBackToLibrary }: GameOverModalProps) {
  return (
    <div className="modal-bd">
      <div className="modal">
        <h2>FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{score.toLocaleString("es-ES")}</div>
        {!saved ? (
          <div className="input-row">
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="TUS INICIALES"
            />
            <button className="btn yellow" onClick={onSave}>
              GUARDAR PUNTUACIÓN
            </button>
          </div>
        ) : (
          <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
        )}
        <div className="actions">
          <button className="btn" onClick={onRestart}>
            JUGAR DE NUEVO
          </button>
          <button className="btn magenta" onClick={onBackToLibrary}>
            VOLVER AL VAULT
          </button>
        </div>
      </div>
    </div>
  );
}
