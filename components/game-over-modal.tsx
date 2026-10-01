export type SaveState = "idle" | "saving" | "saved" | "error";

interface GameOverModalProps {
  score: number;
  name: string;
  // false for the mock games: their simulated score can't be saved.
  playable: boolean;
  saveState: SaveState;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onRestart: () => void;
  onBackToLibrary: () => void;
}

export function GameOverModal({
  score,
  name,
  playable,
  saveState,
  onNameChange,
  onSave,
  onRestart,
  onBackToLibrary,
}: GameOverModalProps) {
  const saving = saveState === "saving";

  return (
    <div className="modal-bd">
      <div className="modal">
        <h2>FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{score.toLocaleString("es-ES")}</div>
        {!playable ? (
          <div className="modal-note">
            ESTE JUEGO AÚN NO GUARDA PUNTUACIONES
          </div>
        ) : saveState === "saved" ? (
          <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
        ) : (
          <>
            <div className="input-row">
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="TUS INICIALES"
                disabled={saving}
              />
              <button className="btn yellow" onClick={onSave} disabled={saving}>
                {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
              </button>
            </div>
            {saveState === "error" && (
              <div className="modal-note error">
                ERROR AL GUARDAR · INTÉNTALO DE NUEVO
              </div>
            )}
          </>
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
