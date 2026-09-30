import type { ReactNode } from "react";

interface CrtScreenProps {
  title: string;
  paused: boolean;
  // A real game to show instead of the decorative arena.
  children?: ReactNode;
}

export function CrtScreen({ title, paused, children }: CrtScreenProps) {
  return (
    <div className="crt">
      <div className="crt-screen">
        {children ?? (
          <div className="game-arena">
            <div className="grid-floor"></div>
            <div className="enemy e1"></div>
            <div className="enemy e2"></div>
            <div className="enemy e3"></div>
            <div className="player-ship"></div>
          </div>
        )}
        {paused && (
          <div
            className="crt-content"
            style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
          >
            <div>
              <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                EN PAUSA
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  marginTop: 10,
                  letterSpacing: "0.16em",
                }}
              >
                PULSA REANUDAR PARA CONTINUAR
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="crt-bottom">
        <span className="led">SEÑAL OK</span>
        <span>{title} · CRT-83 · 60 HZ</span>
        <span>CARGA · 1MB</span>
      </div>
    </div>
  );
}
