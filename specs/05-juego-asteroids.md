# SPEC 05 — Juego Asteroids jugable en el reproductor

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-29
> **Objective:** Portar a TypeScript el Asteroids de `references/started-games/02-asteroids/` como juego real `asteroids` dentro de `/juegos/asteroids/jugar`, conectado al HUD, la pausa y el modal de fin de partida que ya existen.

## Scope

**In:**

- Nueva entrada `asteroids` en `GAMES` (`lib/games-data.ts`), primera de la lista:
  - Título `ASTEROIDS`, categoría `SHOOTER`, color `cyan` y portada `cover-rocas` (se reutiliza).
  - Textos `short` y `long` nuevos en español.
  - `best: 0` y `plays: "0"`, porque es un juego real sin partidas registradas.
  - `ROCAS` se queda como está, como mock.
- Motor del juego en TypeScript en `lib/games/asteroids/`, portado de `game.js`:
  - Misma física, tamaños, velocidades, puntos (20 / 50 / 100), 3 vidas, invencibilidad de 3 s al reaparecer, niveles (`3 + nivel` asteroides) y partículas.
  - Power-up de disparo triple igual que el original: 15 % de probabilidad, garantizado a las 5 destrucciones, uno por nivel, dura 5 s y caduca a los 12 s.
  - Sin variables globales. Los listeners de teclado se registran al crear el motor y se eliminan en `destroy()`.
  - Canvas lógico de 800×600 escalado al 100 % de `.crt-screen` (que ya es 4:3), con el backing store multiplicado por `devicePixelRatio` (máximo 2).
- Estilo neón con los colores de `:root` en `app/globals.css`: nave `--cyan`, asteroides `--yellow`, balas y partículas `--magenta`, power-up `--green`, y glow con `shadowBlur`.
- Dentro del canvas solo se dibujan el juego y el contador del power-up (`3x  N.Ns`). El HUD de puntuación, nivel y vidas y la pantalla `GAME OVER` del original desaparecen del canvas.
- Integración con el reproductor (`/juegos/[id]/jugar`), solo cuando `id === "asteroids"`:
  - `PlayerHud` muestra la puntuación, las vidas y el nivel reales del motor.
  - **Pantalla de inicio**: overlay "ASTEROIDS" / "PULSA ESPACIO PARA EMPEZAR" sobre asteroides flotando. Espacio empieza la partida.
  - **Pausa**: el botón PAUSA/REANUDAR y las teclas `P` y `Esc` congelan y reanudan el motor, y se ve el overlay "EN PAUSA" que ya existe.
  - **Auto-pausa**: si la pestaña se oculta (`visibilitychange`) o la ventana pierde el foco (`blur`) durante una partida, el juego pasa a EN PAUSA.
  - **Fin de partida**: al perder la última vida, o al pulsar FIN, se detiene el motor y se abre el `GameOverModal` con la puntuación final. La puntuación se puede guardar en `av_scores` con `saveScore`.
  - **JUGAR DE NUEVO** reinicia el motor y vuelve a la pantalla de inicio. **SALIR** y **VOLVER AL VAULT** desmontan el motor sin dejar listeners ni bucles vivos.
- `CrtScreen` acepta `children` opcionales que sustituyen a la arena decorativa. Sin `children` se ve igual que hoy.
- Los otros 8 juegos mock siguen con la simulación actual del reproductor.

**Out of scope (for future specs):**

- Controles táctiles o gamepad.
- Sonido.
- Mostrar las puntuaciones guardadas en el detalle del juego o en el Salón de la Fama (hoy los dos usan `seededScores`).
- Guardar puntuaciones en Supabase.
- Contar partidas reales (`plays`) o calcular `best` real.
- Portar Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`).
- Cambiar las etiquetas fijas del detalle (`1 JUGADOR`, `TECLADO / TÁCTIL`, `RETRO 1985`) o su dificultad.
- Portada propia `cover-asteroids`.
- Tabla de récords dentro del canvas, OVNIs u otras mecánicas que no estén en `game.js`.

## Data model

No hay persistencia nueva. Se reutilizan `Game` (`lib/games-data.ts`) y `av_scores` (`lib/scores.ts`), con `game: "asteroids"`.

API pública del motor (`lib/games/asteroids/engine.ts`):

```ts
export interface AsteroidsStats {
  score: number;
  lives: number; // 3 → 0
  level: number; // empieza en 1
}

export interface AsteroidsCallbacks {
  onStats: (stats: AsteroidsStats) => void; // solo cuando cambia algún valor
  onGameOver: (finalScore: number) => void; // al perder la última vida
}

export interface AsteroidsGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: detiene el motor sin llamar a onGameOver
  restart(): void; // estado inicial y vuelta a ready
  destroy(): void; // cancela el requestAnimationFrame y quita los listeners
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame;
```

Fases internas del motor:

```ts
type Phase = "ready" | "playing" | "dead" | "gameover" | "ended";
```

Convenciones:

- `ready`: solo se mueven los asteroides. No hay nave ni colisiones.
- `dead`: igual que el original, 2 s hasta reaparecer.
- `gameover`: las partículas de la explosión siguen 1 s, y después se llama a `onGameOver` una sola vez.
- La pausa es un flag aparte de la fase. En pausa no se actualiza nada, y `dt` se reinicia al reanudar para que no haya salto.
- `dt` sigue limitado a 50 ms, como en el original.
- El motor solo hace `preventDefault` en flechas y Espacio durante `ready` y `playing`, y nunca si el foco está en un `input` o `textarea`. Así el campo de iniciales del modal funciona.
- Las teclas `P` y `Esc`, Espacio para empezar y la auto-pausa las gestiona el componente de React, no el motor.
- Colores: constantes hex en `lib/games/asteroids/constants.ts` copiadas de `:root` (`#00f5ff`, `#f5ff00`, `#ff006e`, `#00ff88`), porque el canvas no lee variables CSS.

Archivos:

| Archivo                                 | Contenido                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `lib/games/asteroids/constants.ts`      | Dimensiones, radios, velocidades, puntos, power-up y colores                   |
| `lib/games/asteroids/entities.ts`       | `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` con `draw(ctx)` tipado     |
| `lib/games/asteroids/engine.ts`         | `createAsteroidsGame`, bucle, input, colisiones y fases                        |
| `components/games/asteroids-canvas.tsx` | Client Component que monta el canvas y el motor, y dibuja el overlay de inicio |

## Implementation plan

1. Añadir la entrada `asteroids` al principio de `GAMES` en `lib/games-data.ts`. La app funciona igual: ASTEROIDS aparece en la Home, la biblioteca, el detalle y el Salón, y su reproductor usa todavía la simulación.
2. Crear `lib/games/asteroids/constants.ts` y `lib/games/asteroids/entities.ts`, portando las clases de `game.js` a TypeScript. Cada `draw` recibe el `CanvasRenderingContext2D`, y cada `update` recibe `dt`, sin globales. Se aplican los colores neón con glow. Todavía no se usan en ninguna parte.
3. Crear `lib/games/asteroids/engine.ts` con `createAsteroidsGame`: estado, bucle con `requestAnimationFrame`, input propio, colisiones, niveles, power-up, fases y callbacks, según el modelo de datos. El canvas no dibuja HUD, solo el contador `3x`. Todavía no se usa.
4. Añadir `children` opcionales a `CrtScreen` y crear `components/games/asteroids-canvas.tsx`: crea el motor en un `useEffect`, lo destruye al desmontar, ajusta el canvas a `devicePixelRatio` y muestra el overlay "PULSA ESPACIO PARA EMPEZAR" hasta que se pulsa Espacio. En `app/juegos/[id]/jugar/page.tsx`, si `id === "asteroids"`, se monta el canvas en lugar de la simulación, y `onStats` alimenta el `PlayerHud`. El juego ya se puede jugar de principio a fin. Los mocks no cambian.
5. Conectar los controles del reproductor para `asteroids`: PAUSA/REANUDAR, `P` y `Esc`, auto-pausa con `visibilitychange` y `blur`, FIN (`end()` y el modal), `onGameOver` (el modal con la puntuación final), JUGAR DE NUEVO (`restart()` y el overlay de inicio) y guardado con `saveScore`. Antes, leer la guía de Client Components en `node_modules/next/dist/docs/01-app/`. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Acceptance criteria

- [x] ASTEROIDS aparece el primero en `/juegos`, en la Home y como primera pestaña del Salón de la Fama, con la portada `cover-rocas`.
- [x] ROCAS sigue apareciendo en el catálogo, y su reproductor sigue con la simulación.
- [x] `/juegos/asteroids/jugar` muestra dentro del CRT asteroides amarillos flotando y el texto "PULSA ESPACIO PARA EMPEZAR". La puntuación no sube hasta pulsar Espacio.
- [x] Tras pulsar Espacio aparece una nave cian en el centro que rota con `←` `→`, acelera con `↑` y dispara balas magenta con Espacio.
- [x] Durante la partida, las flechas y Espacio no hacen scroll de la página.
- [x] Destruir un asteroide grande, mediano o pequeño suma exactamente 20, 50 o 100 puntos en el HUD de la app.
- [x] Al chocar contra un asteroide, las vidas del HUD bajan en uno y la nave reaparece 2 s después parpadeando e invulnerable durante 3 s.
- [x] Al destruir todos los asteroides, el nivel del HUD sube en uno y aparecen `3 + nivel` asteroides grandes.
- [x] Al coger el power-up verde, la nave dispara tres balas durante 5 s y el canvas muestra la cuenta atrás `3x`.
- [x] El canvas no dibuja `SCORE`, `NIVEL`, iconos de vidas ni `GAME OVER`.
- [x] PAUSA, `P` y `Esc` congelan el juego y muestran "EN PAUSA". REANUDAR, `P` y `Esc` lo reanudan sin que los objetos salten.
- [x] Cambiar de pestaña o de ventana durante una partida la deja en EN PAUSA.
- [x] Al perder la tercera vida, la explosión se ve y después se abre el modal "FIN DEL JUEGO" con la puntuación final.
- [x] Pulsar FIN a mitad de partida detiene el juego y abre el modal con la puntuación actual.
- [x] En el modal se pueden escribir iniciales con espacios, y GUARDAR PUNTUACIÓN añade a `av_scores` una entrada con `game: "asteroids"`.
- [x] JUGAR DE NUEVO deja la puntuación en 0, 3 vidas y nivel 01, y vuelve a mostrar "PULSA ESPACIO PARA EMPEZAR".
- [x] Tras salir con SALIR o VOLVER AL VAULT, pulsar Espacio en otra pantalla no hace nada y no hay errores en la consola.
- [x] Entrar y salir del reproductor varias veces no acelera el juego (no quedan bucles duplicados).
- [x] El canvas se ve nítido en una pantalla con `devicePixelRatio` 2 y ocupa todo el `.crt-screen`, también a 375 px de ancho.
- [x] `game.js` de la referencia no se importa ni se copia en `app/` o `lib/`.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** juego nuevo `asteroids` aparte de ROCAS. Decisión del usuario.
- **No:** reemplazar ROCAS o renombrarla. El usuario prefiere conservar el mock.
- **Yes:** primera posición en `GAMES`, con `best: 0` y `plays: "0"`. El juego real se ve en la Home y en el Salón sin cifras inventadas.
- **Yes:** reutilizar `cover-rocas`. Ya representa un campo de asteroides. Una portada propia puede ir en otro spec.
- **Yes:** HUD, pausa y modal de la app, con el canvas solo para el juego. Encaja con el resto del portal y permite guardar la puntuación con el flujo que ya existe.
- **No:** juego autónomo con su HUD y su GAME OVER dentro del canvas. Duplicaría la interfaz y no guardaría puntuaciones.
- **Yes:** motor en un módulo TypeScript encapsulado con `start`, `pause`, `resume`, `end`, `restart` y `destroy`. Se monta y desmonta limpio con React, y sirve de patrón para Tetris y Arkanoid.
- **No:** copiar `game.js` casi literal dentro de un `useEffect`. Sin tipos y con listeners globales difíciles de limpiar.
- **Yes:** el motor no conoce React. Se comunica solo con callbacks, y `onStats` solo se llama cuando cambia algún valor, para no hacer un `setState` por frame.
- **Yes:** colores neón del portal con glow. Coherente con el CRT y la paleta de la app.
- **No:** blanco vectorial del original.
- **Yes:** canvas lógico de 800×600 escalado por CSS. `.crt-screen` ya es 4:3, así que no hay que ajustar la física a otros tamaños.
- **Yes:** solo teclado, más `P` y `Esc` para pausar. Decisión del usuario. Lo táctil va en otro spec.
- **Yes:** mantener el power-up de disparo triple. Es parte del juego de referencia.
- **Yes:** pantalla "PULSA ESPACIO PARA EMPEZAR". El jugador tiene el teclado listo antes de que haya peligro.
- **No:** arrancar la partida al cargar la página, como en el original.
- **Yes:** auto-pausa al ocultar la pestaña o perder el foco. Evita perder vidas sin estar mirando.
- **Yes:** FIN abre el modal con la puntuación actual y permite guardarla. Es el comportamiento actual del reproductor.
- **Yes:** 1 s de explosión antes de abrir el modal tras la última vida. Sin esa espera, el modal taparía la muerte de la nave.
- **Yes:** JUGAR DE NUEVO vuelve a la pantalla de inicio en lugar de arrancar directamente. Así el reinicio se comporta igual que la primera entrada.
- **Yes:** los otros juegos mock mantienen la simulación. Cada juego real llega con su propio spec.
- **Yes:** `P`, `Esc`, Espacio para empezar y la auto-pausa en React, y el movimiento y el disparo en el motor. La pausa es estado de la página (el HUD y el overlay ya dependen de ella), y el motor solo recibe órdenes.

## Risks

| Risk                                                                                                           | Mitigation                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| El motor bloquea Espacio y las flechas en el input de iniciales del modal                                      | `preventDefault` solo en `ready` y `playing`, y nunca con el foco en un `input` o `textarea`.                           |
| Bucles o listeners que sobreviven al desmontar (sobre todo con Strict Mode en desarrollo, que monta dos veces) | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners. Se prueba entrando y saliendo varias veces. |
| `shadowBlur` baja los FPS en equipos lentos                                                                    | Glow moderado y solo en las líneas. Si se nota, se reduce el blur de las partículas.                                    |
| Un salto de `dt` al volver de una pausa o de una pestaña oculta                                                | `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar.                                                              |
| La entrada `asteroids` desplaza a GLOTÓN fuera de la Home (`slice(0, 6)`)                                      | Es aceptable: la Home debe mostrar el juego real.                                                                       |
| El detalle muestra "Mejor global 0" y un ranking falso de `seededScores`                                       | Se asume hasta el spec de puntuaciones reales.                                                                          |

## What is **not** in this spec

- Controles táctiles o gamepad.
- Sonido.
- Puntuaciones reales en el detalle o en el Salón de la Fama, y puntuaciones en Supabase.
- `plays` y `best` reales.
- Tetris y Arkanoid.
- Cambios en las etiquetas del detalle o una portada propia.
- Mecánicas que no estén en `game.js` (OVNIs, récords en el canvas).
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
