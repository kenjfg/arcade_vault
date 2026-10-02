# SPEC 07 — Juego Tetris jugable con leaderboard

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-10-02
> **Objective:** Portar a TypeScript el Tetris de `references/started-games/03-tetris/` como juego real `tetris` (convirtiendo el mock CAÍDA) dentro de `/juegos/tetris/jugar`, con sus puntuaciones en el leaderboard de Supabase.

## Scope

**In:**

- **Registry de juegos** `components/games/registry.ts`, creado antes que nada:
  - Tipos compartidos para lo que el reproductor necesita de cualquier juego: `GameStats`, `GameCanvasHandle` y `GameCanvasProps`.
  - Un mapa `code → { Component, initialStats }`.
  - Asteroids pasa al registry sin cambios de comportamiento.
  - `components/game-player.tsx` deja de usar `isAsteroids`. Monta el componente del registry solo si el juego está registrado **y** tiene `playable = true`. En otro caso usa la simulación actual.
  - El modal solo permite guardar si el juego está registrado y es `playable`. En otro caso muestra "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES".
- **Conversión del mock CAÍDA** con una migración nueva (`UPDATE` de la fila `code = 'caida'`):
  - `code` pasa de `caida` a `tetris`, y `title` de `CAÍDA` a `TETRIS`.
  - `playable` pasa a `true`.
  - Se mantienen la categoría `puzzle`, la portada `cover-tetro`, el color `magenta`, `sort_order` 3 y los textos `short_desc` y `long_desc` actuales.
  - Las URLs `/juegos/caida` y `/juegos/caida/jugar` dejan de existir (404). `/salon-de-la-fama?juego=caida` cae al primer juego, como cualquier código inexistente.
- **Motor** en TypeScript en `lib/games/tetris/`, portado de `game.js`:
  - Tablero de 10×20 celdas de 30 px lógicos.
  - Las **7 piezas estándar** I, O, T, S, Z, J y L, con las mismas matrices que `game.js`. La pieza "N (tuerca)" no se porta.
  - Sorteo uniforme entre las 7 en cada pieza nueva. La pieza aparece en `y = 0` y `x = floor(10 / 2) − floor(ancho / 2)`.
  - Rotación horaria (transponer y luego invertir) con wall kicks en este orden: 0, −1, +1, −2, +2 columnas. Si ninguna posición cabe, no rota.
  - Caída automática cada `dropInterval = max(100, 1000 − (nivel − 1) × 90)` ms. El acumulador se pone a 0 en cada paso, como en el original. Si la pieza no puede bajar, se fija en ese mismo tick (sin lock delay).
  - Limpieza de líneas completas de abajo arriba, con una fila vacía nueva arriba por cada línea.
  - Puntuación:
    - Las líneas limpiadas a la vez valen `[0, 100, 300, 500, 800] × nivel`, con el nivel que había antes de sumarlas.
    - Soft drop: +1 por fila bajada. Si `↓` choca, la pieza se fija sin sumar.
    - Hard drop: +2 por fila recorrida, y la pieza se fija.
  - Nivel `floor(líneas / 10) + 1`, recalculado tras cada limpieza junto con `dropInterval`.
  - Pieza fantasma (ghost) en la posición de aterrizaje, dibujada con alfa 0.2.
  - Fin de partida: la pieza nueva colisiona al aparecer.
  - Sin variables globales. Los listeners de teclado se registran al crear el motor y se quitan en `destroy()`.
- **Dibujo** en un canvas lógico de 800×600 escalado a `.crt-screen`:
  - El tablero (300×600) va centrado, de `x = 250` a `x = 550`, con su rejilla y un borde neón.
  - **Panel izquierdo:** contador `LÍNEAS` con el total de líneas de la partida.
  - **Panel derecho:** `NEXT` con la pieza siguiente dentro de una caja de 4×4 celdas.
  - Colores de pieza: los 4 neón de `:root` más 3 tonos neón extra, con glow moderado (ver Data model).
  - El canvas no dibuja puntuación, nivel, vidas, PAUSA ni GAME OVER. Tampoco dibuja la lista de controles ni el botón de tema del original.
- **Componente** `components/games/tetris-canvas.tsx`, con la misma estructura que `asteroids-canvas.tsx`:
  - **Pantalla de inicio**: el tablero vacío con rejilla y los paneles `NEXT` y `LÍNEAS` vacíos. Encima, el overlay "TETRIS" / "PULSA ESPACIO PARA EMPEZAR". No cae nada hasta pulsar Espacio, y ese Espacio no hace hard drop.
  - **Pausa**: el botón PAUSA/REANUDAR y las teclas `P` y `Esc` congelan y reanudan el motor, con el overlay "EN PAUSA" que ya existe.
  - **Auto-pausa**: `visibilitychange` (oculta) y `blur` de la ventana pausan durante una partida.
- **HUD**:
  - PUNTUACIÓN es la puntuación del motor y NIVEL es el nivel del motor.
  - **VIDAS no se muestra** para Tetris. `PlayerHud` acepta `lives: null` y entonces no pinta la casilla VIDAS. Asteroids y los mocks la siguen viendo igual.
- **Fin de partida**:
  - Cuando la pieza nueva no cabe, la pila queda congelada 1 s y después se llama a `onGameOver` una sola vez. El modal se abre con la puntuación final.
  - FIN detiene el motor y abre el modal con la puntuación actual.
  - GUARDAR PUNTUACIÓN usa el `submitScore` que ya existe.
  - JUGAR DE NUEVO vacía el tablero, pone a 0 la puntuación y las líneas, deja el nivel en 1 y vuelve a la pantalla de inicio.
- Sin cambios en el leaderboard: `scores`, `leaderboard`, `game_stats`, RLS, `submitScore`, `lib/games-db.ts`, el detalle, el Salón de la Fama, la biblioteca y `GameOverModal` funcionan igual. El juego solo necesita la fila `playable`, el motor, el componente y la entrada del registry.

**Out of scope (for future specs):**

- La pieza "N (tuerca)" de `game.js`.
- Bolsa de 7 (7-bag), hold, rotación antihoraria, SRS completo, lock delay, T-spins, combos o back-to-back.
- Auto-repetición propia (DAS/ARR). Se usa la repetición de teclas del sistema, como en el original.
- Mostrar las líneas en el HUD de la app.
- Tema claro/oscuro y su `localStorage`.
- Controles táctiles o gamepad.
- Sonido.
- Portada propia `cover-tetris` y textos nuevos.
- Redirigir `/juegos/caida` a `/juegos/tetris`.
- Extraer un hook común a `asteroids-canvas.tsx` y `tetris-canvas.tsx` (resize, pausa, inicio).
- Antitrampas o verificación de la puntuación en servidor.
- Portar Arkanoid (`04-arkanoid`).

## Data model

No hay tablas nuevas. La migración cambia una fila de `games`.

**Migración** `supabase/migrations/<timestamp>_convert_caida_to_tetris.sql` (con `npx supabase migration new convert_caida_to_tetris`):

- `UPDATE public.games` donde `code = 'caida'`: `code = 'tetris'`, `title = 'TETRIS'`, `playable = true`.
- No toca `short_desc`, `long_desc`, `category_id`, `cover`, `color` ni `sort_order` (3). Como `sort_order` no cambia, no hay que desplazar otras filas.
- `caida` nunca fue `playable`, así que no tiene filas en `scores` que migrar.

**Registry** (`components/games/registry.ts`):

```ts
export interface GameStats {
  score: number;
  lives: number | null; // null: el juego no tiene vidas y el HUD no muestra VIDAS
  level: number;
}

export interface GameCanvasHandle {
  end(): void;
  restart(): void;
}

export interface GameCanvasProps {
  ref?: Ref<GameCanvasHandle>;
  paused: boolean;
  over: boolean;
  onStats: (stats: GameStats) => void;
  onGameOver: (finalScore: number) => void;
  onTogglePause: () => void;
  onAutoPause: () => void;
}

export const GAME_REGISTRY: Record<
  string,
  { Component: ComponentType<GameCanvasProps>; initialStats: GameStats }
>;
// asteroids → { AsteroidsCanvas, { score: 0, lives: 3, level: 1 } }
// tetris    → { TetrisCanvas,    { score: 0, lives: null, level: 1 } }
```

**API pública del motor** (`lib/games/tetris/engine.ts`):

```ts
export interface TetrisStats {
  score: number;
  lives: null; // Tetris no tiene vidas
  level: number; // empieza en 1
}

export interface TetrisCallbacks {
  onStats: (stats: TetrisStats) => void; // solo cuando cambia la puntuación o el nivel
  onGameOver: (finalScore: number) => void; // 1 s después de que la pieza nueva no quepa
}

export interface TetrisGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: detiene el motor sin llamar a onGameOver
  restart(): void; // estado inicial y vuelta a ready
  destroy(): void; // cancela el requestAnimationFrame y quita los listeners
}

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): TetrisGame;
```

Fases internas del motor:

```ts
type Phase = "ready" | "playing" | "gameover" | "ended";
```

Convenciones:

- `ready`: se dibujan el tablero vacío con rejilla y los paneles vacíos. No hay pieza actual ni siguiente.
- `playing`: `start()` sortea la pieza actual y la siguiente.
- `gameover`: la pila se queda congelada 1 s sin aceptar teclas, y después se llama a `onGameOver` una sola vez. La pieza que no cabe no se dibuja.
- `ended`: tras FIN no se actualiza nada ni se llama a `onGameOver`.
- Las líneas solo las ve el panel `LÍNEAS` del canvas. No van en `TetrisStats`.
- La pausa es un flag aparte de la fase. En pausa no se actualiza nada, y `lastTime` se reinicia al reanudar para que no haya salto.
- `dt` está limitado a 50 ms y se suma al acumulador de caída. No se usa `setInterval`.
- Teclas del motor, solo en `playing`: `←` y `→` mueven, `↑` y `X` rotan, `↓` hace soft drop y Espacio hace hard drop.
- `preventDefault` en las flechas y en Espacio, solo en `ready` y `playing`, y nunca con el foco en un `input` o `textarea`.
- `P`, `Esc`, Espacio para empezar y la auto-pausa los gestiona el componente de React, no el motor.
- El listener de teclado del motor se registra al crearse, antes que el de inicio del componente. Además, en `ready` el motor ignora las teclas. Así el Espacio que empieza la partida no hace hard drop.
- Colores en `lib/games/tetris/constants.ts` (el canvas no lee variables CSS):

  | Pieza | Color    | Hex                     |
  | ----- | -------- | ----------------------- |
  | I     | cian     | `#00f5ff` (`--cyan`)    |
  | O     | amarillo | `#f5ff00` (`--yellow`)  |
  | T     | violeta  | `#b026ff`               |
  | S     | verde    | `#00ff88` (`--green`)   |
  | Z     | magenta  | `#ff006e` (`--magenta`) |
  | J     | azul     | `#2979ff`               |
  | L     | naranja  | `#ff8c00`               |

- Los textos `LÍNEAS` y `NEXT` usan una fuente `monospace`, como el contador `3x` de Asteroids.

**HUD:** `PlayerHud` pasa a recibir `lives: number | null`. Con `null` no pinta la casilla VIDAS. Con un número se ve igual que hoy.

**Archivos:**

| Archivo                                                       | Cambio                                                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `components/games/registry.ts`                                | Nuevo: tipos compartidos y `GAME_REGISTRY` (`asteroids`, y después `tetris`)                               |
| `components/games/asteroids-canvas.tsx`                       | Usa los tipos del registry (`GameCanvasProps`, `GameCanvasHandle`), sin cambios de comportamiento          |
| `components/game-player.tsx`                                  | Busca `game.code` en el registry. Simulación y modal sin guardado si no está registrado o no es `playable` |
| `components/player-hud.tsx`                                   | `lives: number \| null`. Con `null` oculta VIDAS                                                           |
| `supabase/migrations/<timestamp>_convert_caida_to_tetris.sql` | Nuevo: `UPDATE` de `caida` a `tetris`                                                                      |
| `lib/supabase/database.types.ts`                              | Regenerado con `npm run db:types` (no se esperan cambios de tipos)                                         |
| `lib/games/tetris/constants.ts`                               | Tablero, tamaños, piezas, tabla de puntos, velocidades, layout de paneles y colores                        |
| `lib/games/tetris/engine.ts`                                  | `createTetrisGame`: estado, bucle, input, rotación, colisiones, líneas, fases y callbacks                  |
| `components/games/tetris-canvas.tsx`                          | Nuevo: Client Component que monta el canvas y el motor, y dibuja el overlay de inicio                      |

El tablero y las piezas son matrices y funciones puras, así que no hay `entities.ts`. Viven en `engine.ts`, o en un `board.ts` si `engine.ts` crece demasiado.

## Implementation plan

1. **Registry.** Leer antes `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
   - Crear `components/games/registry.ts` con los tipos compartidos y la entrada `asteroids`.
   - `AsteroidsCanvas` usa los tipos del registry.
   - `PlayerHud` acepta `lives: number | null`.
   - `game-player.tsx` busca `game.code` en el registry y solo monta el componente si además `game.playable`. Pasa `playable = registrado && game.playable` al modal.
   - Resultado: Asteroids se juega exactamente igual que en el SPEC 05 y los mocks no cambian.
2. **Migración.** Crear `convert_caida_to_tetris` y aplicarla con `npx supabase db push`. Revisar `get_advisors` de seguridad y ejecutar `npm run db:types`.
   - Resultado: TETRIS aparece en tercera posición en la Home, la biblioteca y el Salón, con las URLs `/juegos/tetris`.
   - Su reproductor sigue con la simulación y el modal dice "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES", porque todavía no está en el registry.
3. **Constantes.** Crear `lib/games/tetris/constants.ts`: 10×20, 30 px, las 7 matrices, `LINE_SCORES`, la fórmula de velocidad, los colores neón, el layout del tablero y de los paneles, y el retraso de game over de 1 s. Todavía no se usa.
4. **Motor.** Crear `lib/games/tetris/engine.ts` con `createTetrisGame` según el modelo de datos: estado, bucle con `requestAnimationFrame`, input propio, colisiones, rotación con kicks, ghost, líneas, puntuación, nivel, fases, dibujo del tablero y de los paneles, y callbacks. Todavía no se usa.
5. **Componente y registry.** Crear `components/games/tetris-canvas.tsx` con la estructura de `asteroids-canvas.tsx`: `ResizeObserver` con DPR máximo 2, handle `end`/`restart`, `useEffectEvent`, overlay "TETRIS" / "PULSA ESPACIO PARA EMPEZAR", `P`/`Esc` y auto-pausa. Añadir `tetris` a `GAME_REGISTRY` con `initialStats` `{ score: 0, lives: null, level: 1 }`.
   - Resultado: `/juegos/tetris/jugar` se juega de principio a fin. El HUD muestra puntuación y nivel, sin VIDAS.
6. **Verificación del flujo completo.** Comprobar PAUSA, FIN, game over con 1 s de espera, el modal, GUARDAR PUNTUACIÓN con `submitScore` y JUGAR DE NUEVO, y corregir lo que falle. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Acceptance criteria

- [x] `supabase/migrations/` contiene `convert_caida_to_tetris`, y `npx supabase migration list` la muestra aplicada en local y en remoto.
- [x] En `games` ya no existe `caida`. La fila `tetris` tiene `title = 'TETRIS'`, `playable = true`, categoría `puzzle`, `cover-tetro`, `magenta`, `sort_order` 3 y los textos que tenía CAÍDA. Las demás filas no cambian.
- [x] Los advisors de seguridad no muestran avisos nuevos.
- [x] TETRIS aparece en tercera posición en `/juegos` y en la Home, y como pestaña del Salón de la Fama, con la portada `cover-tetro`.
- [x] `/juegos/caida` da 404.
- [x] `/juegos/tetris/jugar` muestra el tablero vacío con rejilla, los paneles `NEXT` y `LÍNEAS` vacíos y el texto "PULSA ESPACIO PARA EMPEZAR". No cae ninguna pieza hasta pulsar Espacio.
- [x] El Espacio que empieza la partida no suelta ninguna pieza.
- [x] Solo aparecen las piezas I, O, T, S, Z, J y L, cada una con su color de la tabla. La tuerca no aparece nunca.
- [x] `←` y `→` mueven la pieza una columna sin atravesar paredes ni bloques. `↑` y `X` la rotan en sentido horario.
- [x] Junto a una pared, rotar una I desplaza la pieza para que quepa en lugar de bloquear la rotación, siempre que haya hueco.
- [x] Una pieza que no puede bajar se fija en el siguiente tick de caída.
- [x] La pieza fantasma se ve semitransparente en la posición donde aterrizaría.
- [x] El panel `NEXT` muestra la pieza que aparece justo después.
- [x] Cada `↓` que baja la pieza suma exactamente 1 punto. Un `↓` que choca fija la pieza sin sumar.
- [x] Espacio deja caer la pieza al instante y suma exactamente 2 puntos por fila recorrida.
- [x] Con nivel 1, limpiar 1, 2, 3 o 4 líneas a la vez suma exactamente 100, 300, 500 o 800 puntos. Con nivel N, suma esa cifra × N.
- [x] El panel `LÍNEAS` suma las líneas limpiadas.
- [x] Al llegar a 10 líneas, el NIVEL del HUD pasa a 02 y las piezas caen más rápido. La línea que hace llegar a 10 todavía puntúa con el nivel 1.
- [x] El HUD muestra la puntuación y el nivel del motor y no muestra la casilla VIDAS.
- [x] En Asteroids y en los mocks, el HUD sigue mostrando VIDAS como antes.
- [x] El canvas no dibuja puntuación, nivel, vidas, PAUSA, GAME OVER, la lista de controles ni el botón de tema.
- [x] PAUSA, `P` y `Esc` congelan el juego y muestran "EN PAUSA". REANUDAR, `P` y `Esc` lo reanudan sin que la pieza baje de golpe.
- [x] Cambiar de pestaña o de ventana durante una partida la deja en EN PAUSA.
- [x] Cuando una pieza nueva no cabe, la pila se ve congelada 1 s y después se abre "FIN DEL JUEGO" con la puntuación final.
- [x] FIN a mitad de partida detiene el juego y abre el modal con la puntuación actual.
- [x] GUARDAR PUNTUACIÓN inserta una fila en `scores` para `tetris`. Después, `/juegos/tetris` muestra Partidas, Mejor global y el jugador en el ranking, y `/salon-de-la-fama?juego=tetris` lo muestra.
- [x] JUGAR DE NUEVO deja la puntuación en 0, el nivel en 01, `LÍNEAS` en 0 y el tablero vacío, y vuelve a mostrar "PULSA ESPACIO PARA EMPEZAR".
- [x] Durante la partida, las flechas y Espacio no hacen scroll de la página. En el modal, el campo de iniciales acepta espacios, `X` y cualquier otra tecla.
- [x] Tras salir con SALIR o VOLVER AL VAULT, las teclas del juego no hacen nada en otras pantallas y no hay errores en la consola.
- [x] Entrar y salir del reproductor varias veces no acelera la caída.
- [x] El canvas se ve nítido con `devicePixelRatio` 2 y ocupa todo el `.crt-screen`, también a 375 px de ancho.
- [x] Asteroids se sigue jugando exactamente igual que en el SPEC 05: HUD con vidas, pausa, auto-pausa, FIN, JUGAR DE NUEVO y guardado.
- [x] En un mock (p. ej. SERPENTINA) se ve la simulación y el modal "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES".
- [x] `game.js` de la referencia no se importa ni se copia en `app/`, `components/` o `lib/`.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** convertir el mock CAÍDA en Tetris. Decisión del usuario. Evita tener dos juegos de piezas en el catálogo.
- **No:** fila nueva `tetris` manteniendo CAÍDA como mock, como hizo el SPEC 05 con ROCAS. Descartado por el usuario.
- **Yes:** cambiar el `code` a `tetris`. Decisión del usuario, aceptando que `/juegos/caida` pase a dar 404.
- **No:** conservar `code = caida`. La URL no coincidiría con el juego.
- **Yes:** título `TETRIS`. Decisión del usuario, igual que ASTEROIDS usa el nombre real.
- **Yes:** mantener `sort_order` 3. No hay que desplazar filas y el juego sigue en la Home.
- **No:** ponerlo segundo, tras ASTEROIDS. Exigía desplazar `sort_order` en dos pasadas.
- **Yes:** reutilizar `cover-tetro`, `magenta`, la categoría `puzzle` y los textos de CAÍDA. Decisión del usuario: ya describen el juego.
- **No:** portada nueva o textos nuevos.
- **Yes:** solo las 7 piezas estándar. Decisión del usuario, en línea con el README.
- **No:** portar la pieza "N (tuerca)" que solo existe en `game.js`.
- **Yes:** ocultar VIDAS con `lives: null` en `PlayerHud`. Decisión del usuario. Es un cambio de UI compartida, pero Asteroids y los mocks no cambian.
- **No:** `lives = 0`, que mostraría "—" y parece "sin vidas". **No:** `lives = 1` fijo, una vida inventada.
- **Yes:** `NEXT` y `LÍNEAS` dibujados en los laterales del canvas. Decisión del usuario: aprovecha los 250 px libres a cada lado del tablero.
- **No:** añadir LÍNEAS al HUD de la app.
- **Yes:** colores neón de `:root` más violeta, azul y naranja neón, con glow moderado. Decisión del usuario: coherente con el portal.
- **No:** los colores pastel del original.
- **Yes:** 1 s con la pila congelada antes del modal. Decisión del usuario, igual que Asteroids: se ve cómo acaba la partida.
- **No:** modal inmediato, como el original.
- **Yes:** los controles del original, con la repetición de teclas del sistema, y Espacio para empezar. Decisión del usuario: es lo mismo que en Asteroids.
- **No:** Enter para empezar.
- **Yes:** el motor ignora las teclas en `ready`, para que el Espacio de inicio no haga hard drop.
- **Yes:** tablero vacío con paneles detrás del overlay de inicio. Decisión del usuario.
- **No:** fondo negro hasta empezar.
- **Yes:** crear el registry en el primer paso, antes de la migración. Decisión del usuario: `tetris` nunca puede guardar puntuaciones simuladas entre pasos, porque el modal solo permite guardar si el juego está registrado y es `playable`.
- **No:** migración primero, como en el playbook. Entre pasos, `/juegos/tetris/jugar` podría guardar puntuaciones falsas.
- **Yes:** un juego registrado sin `playable`, o `playable` sin registrar, cae a la simulación sin guardado. Las dos condiciones tienen que cumplirse.
- **Yes:** `P`, `Esc`, Espacio para empezar y la auto-pausa en el componente, y el juego en el motor. Es el patrón del SPEC 05.
- **Yes:** sorteo uniforme, sin lock delay y con el acumulador de caída a 0 en cada paso, como en `game.js`. Las mejoras de jugabilidad modernas van en otro spec.
- **Yes:** copiar la estructura de `asteroids-canvas.tsx` en lugar de extraer un hook común. Así no se toca más Asteroids en este spec.
- **Yes:** no se cambia el leaderboard. La puntuación de Tetris es un entero creciente muy por debajo de 10 000 000.

## Risks

| Risk                                                                         | Mitigation                                                                                                                              |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| El Espacio que empieza la partida también hace hard drop                     | El motor ignora las teclas en `ready` y su listener se registra antes que el de inicio. Hay un criterio de aceptación.                  |
| El motor bloquea Espacio, `X` o las flechas en el input de iniciales         | `preventDefault` solo en `ready` y `playing`, nunca con el foco en un `input` o `textarea`, y el motor no hace nada fuera de `playing`. |
| Mover Asteroids al registry cambia su comportamiento                         | El paso 1 se comprueba con los criterios del SPEC 05 antes de seguir.                                                                   |
| Ocultar VIDAS rompe el layout del HUD                                        | Solo se quita la casilla. El contenedor ya es `flex-wrap`. Se revisa a 375 px.                                                          |
| Bucles o listeners que sobreviven al desmontar (Strict Mode monta dos veces) | `destroy()` cancela el rAF y quita los listeners. Se prueba entrando y saliendo varias veces.                                           |
| Salto de `dt` al volver de una pausa o de una pestaña oculta                 | `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar.                                                                              |
| Enlaces externos o marcadores a `/juegos/caida` dan 404                      | Aceptado por el usuario. La redirección queda fuera de alcance.                                                                         |
| `shadowBlur` en 200 celdas baja los FPS                                      | Glow moderado y solo en el borde de cada bloque, o en la pieza activa si se nota.                                                       |
| Cambiar `code` con un `UPDATE` deja la página `/juegos/caida` en caché       | `npm run build` regenera las rutas. En desarrollo basta con recargar.                                                                   |

## What is **not** in this spec

- La pieza "N (tuerca)".
- 7-bag, hold, rotación antihoraria, SRS, lock delay, T-spins, combos y DAS/ARR.
- Las líneas en el HUD de la app.
- Tema claro/oscuro.
- Controles táctiles, gamepad y sonido.
- Portada o textos nuevos, y la redirección de `/juegos/caida`.
- Hook común para los componentes de canvas.
- Antitrampas y cambios en el leaderboard.
- Arkanoid.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
