# SPEC 08 — Juego Arkanoid jugable con leaderboard

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-10-06
> **Objective:** Portar a TypeScript el Arkanoid de `references/started-games/04-arkanoid/` como juego real `arkanoid` (convirtiendo el mock BLOQUE BUSTER) dentro de `/juegos/arkanoid/jugar`, con sus puntuaciones en el leaderboard de Supabase.

## Scope

**In:**

- **Conversión del mock BLOQUE BUSTER** con una migración nueva (`UPDATE` de la fila `code = 'bloque-buster'`):
  - `code` pasa de `bloque-buster` a `arkanoid`, y `title` de `BLOQUE BUSTER` a `ARKANOID`.
  - `playable` pasa a `true`.
  - Se mantienen la categoría `arcade`, la portada `cover-bricks`, el color `cyan`, `sort_order` 2 y los textos `short_desc` y `long_desc` actuales.
  - Las URLs `/juegos/bloque-buster` y `/juegos/bloque-buster/jugar` dejan de existir (404). `/salon-de-la-fama?juego=bloque-buster` cae al primer juego, como cualquier código inexistente.
- **Motor** en TypeScript en `lib/games/arkanoid/`, portado de `game.js` y `levels.js`:
  - Campo de juego de 800×600 lógicos: todo el canvas, sin paneles laterales. Rebote en las paredes izquierda, derecha y superior. Por abajo la pelota se pierde.
  - **Paleta** de 81×14 en `y = 560`, centrada al crearse el motor. Se mueve con `←`/`→` a 400 px/s y con el ratón: al moverse sobre el canvas, la paleta se centra en el cursor, con la posición convertida a coordenadas lógicas con la escala del canvas y limitada a `[0, 800 − 81]`.
  - **Pelota** de 16×16 (colisión AABB). Sale de encima de la paleta, centrada en ella, con `vx = 200 × velocidad` y `vy = −300 × velocidad`, siendo `velocidad` el multiplicador del nivel. Se mueve en cuanto aparece, sin esperar a que se lance.
  - **Rebote en la paleta** igual que en la referencia: solo si `vy > 0`, con solapamiento horizontal y el borde inferior de la pelota entre `paleta.y` y `paleta.y + 14 + 8`. Coloca la pelota encima de la paleta y pone `vy = −|vy|`. El ángulo no cambia.
  - **Bloques** de 64×24 en una rejilla de 10×6, con origen en `x = 80`, `y = 80`. Al chocar con un bloque vivo, el bloque se rompe, suma **10 puntos** y la pelota invierte `vy`. Se rompe como mucho un bloque por frame.
  - **Explosión** de cada bloque roto durante 150 ms. Es un efecto vectorial (destello o fundido del contorno del bloque en su color) que sustituye a los 4 frames del spritesheet.
  - **Vidas:** 3. Si la pelota cae por debajo de `y = 600`, se pierde una vida y la pelota vuelve a salir de la paleta. Con 0 vidas, fin de partida.
  - **Los 5 niveles de `levels.js`** con sus mismos patrones, colores y multiplicadores: 1.00 (parrilla), 1.10 (pirámide), 1.21 (ajedrez), 1.33 (filas con huecos) y 1.46 (marco + cruz).
  - **Paso de nivel instantáneo** al romper el último bloque: aparecen los bloques del nivel siguiente, se borran las explosiones y la pelota vuelve a salir de la paleta con la velocidad del nuevo nivel. La paleta se queda donde estaba.
  - **Victoria:** romper el último bloque del nivel 5 termina la partida igual que perder la última vida.
  - Sin variables globales. Los listeners (teclado y ratón) se registran al crear el motor y se quitan en `destroy()`.
- **Dibujo** vectorial neón en un canvas lógico de 800×600 escalado a `.crt-screen`:
  - Bloques rellenos o con contorno en su color neón, con glow moderado (ver Data model).
  - Paleta y pelota con colores neón de `:root` y glow moderado.
  - El canvas no dibuja puntuación, nivel, vidas, PAUSA, GAME OVER, el texto de victoria ni el selector de niveles. Tampoco usa el spritesheet.
- **Componente** `components/games/arkanoid-canvas.tsx`, con la misma estructura que `tetris-canvas.tsx`:
  - **Pantalla de inicio**: la escena del nivel 1 quieta (bloques, paleta centrada y pelota encima) bajo el overlay "ARKANOID" / "PULSA ESPACIO PARA EMPEZAR". Nada se mueve, ni con el ratón ni con las flechas, hasta pulsar Espacio.
  - **Pausa**: el botón PAUSA/REANUDAR y las teclas `P` y `Esc` congelan y reanudan el motor, con el overlay "EN PAUSA" que ya existe. En pausa el ratón no mueve la paleta.
  - **Auto-pausa**: `visibilitychange` (oculta) y `blur` de la ventana pausan durante una partida.
- **Registry**: entrada `arkanoid` en `GAME_REGISTRY` con `initialStats` `{ score: 0, lives: 3, level: 1 }`.
- **HUD**: PUNTUACIÓN es la puntuación del motor, VIDAS son las vidas del motor (empiezan en 3) y NIVEL es el nivel actual (1–5). `PlayerHud` no cambia.
- **Fin de partida**:
  - Al perder la última vida o romper el último bloque del nivel 5, la escena queda congelada 1 s y después se llama a `onGameOver` una sola vez. El modal "FIN DEL JUEGO" se abre con la puntuación final.
  - FIN detiene el motor y abre el modal con la puntuación actual.
  - GUARDAR PUNTUACIÓN usa el `submitScore` que ya existe.
  - JUGAR DE NUEVO vuelve al nivel 1 con todos sus bloques, la puntuación a 0, 3 vidas, la paleta centrada y la pantalla de inicio.
- Sin cambios en el leaderboard: `scores`, `leaderboard`, `game_stats`, RLS, `submitScore`, `lib/games-db.ts`, el detalle, el Salón de la Fama, la biblioteca, `GameOverModal`, `PlayerHud` y `game-player.tsx` funcionan igual. El juego solo necesita la fila `playable`, el motor, el componente y la entrada del registry.

**Out of scope (for future specs):**

- Sonido (`ball-bounce.mp3`, `break-sound.mp3`) y la carpeta `public/`.
- Spritesheet y sprites de la referencia.
- Selector de nivel en la pausa.
- Ángulo de rebote según el punto de impacto en la paleta, pelota pegada a la paleta hasta lanzarla, bloques con varios golpes, power-ups, enemigos.
- Pantalla "NIVEL N" entre niveles y texto de victoria en el canvas.
- Bucle infinito de niveles tras el nivel 5.
- Controles táctiles o gamepad.
- Portada propia `cover-arkanoid` y textos nuevos.
- Redirigir `/juegos/bloque-buster` a `/juegos/arkanoid`.
- Extraer un hook común a los componentes de canvas.
- Antitrampas o verificación de la puntuación en servidor.

## Data model

No hay tablas nuevas. La migración cambia una fila de `games`.

**Migración** `supabase/migrations/<timestamp>_convert_bloque_buster_to_arkanoid.sql` (con `npx supabase migration new convert_bloque_buster_to_arkanoid`):

- `UPDATE public.games` donde `code = 'bloque-buster'`: `code = 'arkanoid'`, `title = 'ARKANOID'`, `playable = true`.
- No toca `short_desc`, `long_desc`, `category_id`, `cover`, `color` ni `sort_order` (2).
- `bloque-buster` nunca fue `playable`, así que no tiene filas en `scores` que migrar.

**API pública del motor** (`lib/games/arkanoid/engine.ts`):

```ts
export interface ArkanoidStats {
  score: number;
  lives: number; // empieza en 3
  level: number; // 1–5
}

export interface ArkanoidCallbacks {
  onStats: (stats: ArkanoidStats) => void; // solo cuando cambia la puntuación, las vidas o el nivel
  onGameOver: (finalScore: number) => void; // 1 s después de perder la última vida o ganar el nivel 5
}

export interface ArkanoidGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: detiene el motor sin llamar a onGameOver
  restart(): void; // estado inicial y vuelta a ready
  destroy(): void; // cancela el requestAnimationFrame y quita los listeners
}

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
): ArkanoidGame;
```

Fases internas del motor:

```ts
type Phase = "ready" | "playing" | "gameover" | "ended";
```

Convenciones:

- `ready`: se dibuja la escena del nivel 1 quieta. El motor ignora el teclado y el ratón.
- `playing`: `start()` pone la pelota en marcha.
- `gameover`: se usa para la derrota y para la victoria. La escena se queda congelada 1 s sin aceptar input, y después se llama a `onGameOver` una sola vez. Al perder la última vida, la pelota no se vuelve a dibujar.
- `ended`: tras FIN no se actualiza nada ni se llama a `onGameOver`.
- La pausa es un flag aparte de la fase. En pausa no se actualiza nada (tampoco la paleta con el ratón), y `lastTime` se reinicia al reanudar para que no haya salto.
- `dt` está limitado a 50 ms.
- Input del motor, solo en `playing`: `←` y `→` (mantener pulsadas) y `mousemove` sobre el canvas. El estado de las flechas se limpia en `pause()`, `end()` y `restart()` para que la paleta no siga moviéndose al volver.
- `preventDefault` en `←`, `→` y Espacio, solo en `ready` y `playing`, y nunca con el foco en un `input` o `textarea`. El Espacio no tiene ninguna acción en el motor: solo se evita que haga scroll de la página, como en Tetris.
- `P`, `Esc`, Espacio para empezar y la auto-pausa los gestiona el componente de React, no el motor.

**Niveles** (`lib/games/arkanoid/levels.ts`): `LEVELS: readonly Level[]` con `Level = { speed: number; blocks: { col: number; row: number; color: BlockColor }[] }`, generados igual que en `levels.js`. Patrones, colores por fila y multiplicadores idénticos.

**Colores** en `lib/games/arkanoid/constants.ts` (el canvas no lee variables CSS):

| Color de la referencia | Neón         | Hex                     |
| ---------------------- | ------------ | ----------------------- |
| `cyan`                 | cian         | `#00f5ff` (`--cyan`)    |
| `yellow`               | amarillo     | `#f5ff00` (`--yellow`)  |
| `magenta`              | magenta      | `#ff006e` (`--magenta`) |
| `green`                | verde        | `#00ff88` (`--green`)   |
| `red`                  | rojo neón    | `#ff3131`               |
| `hotpink`              | rosa neón    | `#ff4fd8`               |
| `gray`                 | gris azulado | `#8a90b8`               |

- La paleta es cian (`#00f5ff`) y la pelota amarilla (`#f5ff00`), las dos con glow moderado.

**Constantes** (`lib/games/arkanoid/constants.ts`): tamaño lógico 800×600, paleta (81×14, `y = 560`, 400 px/s), pelota (16×16, `vx` base 200, `vy` base −300), tolerancia de rebote en la paleta (8), rejilla (10×6, 64×24, origen 80/80), 10 puntos por bloque, 3 vidas, explosión de 150 ms, retraso de game over de 1 s y la tabla de colores.

**Archivos:**

| Archivo                                                                 | Cambio                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `supabase/migrations/<timestamp>_convert_bloque_buster_to_arkanoid.sql` | Nuevo: `UPDATE` de `bloque-buster` a `arkanoid`                                                  |
| `lib/supabase/database.types.ts`                                        | Regenerado con `npm run db:types` (no se esperan cambios de tipos)                               |
| `lib/games/arkanoid/constants.ts`                                       | Nuevo: tamaños, velocidades, puntos, vidas, tiempos y colores                                    |
| `lib/games/arkanoid/levels.ts`                                          | Nuevo: `LEVELS` tipado, portado de `levels.js`                                                   |
| `lib/games/arkanoid/engine.ts`                                          | Nuevo: `createArkanoidGame`: estado, bucle, input, colisiones, niveles, fases, dibujo, callbacks |
| `components/games/arkanoid-canvas.tsx`                                  | Nuevo: Client Component que monta el canvas y el motor, y dibuja el overlay de inicio            |
| `components/games/registry.ts`                                          | Añade la entrada `arkanoid`                                                                      |

Paleta, pelota y bloques son objetos planos y funciones puras, así que no hay `entities.ts`. Viven en `engine.ts`.

## Implementation plan

1. **Migración.** Crear `convert_bloque_buster_to_arkanoid` y aplicarla con `npx supabase db push`. Revisar `get_advisors` de seguridad y ejecutar `npm run db:types`.
   - Resultado: ARKANOID aparece en segunda posición en la Home, la biblioteca y el Salón, con las URLs `/juegos/arkanoid`.
   - Su reproductor sigue con la simulación y el modal dice "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES", porque todavía no está en el registry.
2. **Constantes y niveles.** Crear `lib/games/arkanoid/constants.ts` y `lib/games/arkanoid/levels.ts` según el modelo de datos. Todavía no se usan.
3. **Motor.** Crear `lib/games/arkanoid/engine.ts` con `createArkanoidGame` según el modelo de datos: estado, bucle con `requestAnimationFrame`, teclado y ratón, paleta, pelota, rebotes, bloques, explosiones, vidas, niveles, victoria, fases, dibujo y callbacks. Todavía no se usa.
4. **Componente y registry.** Leer antes `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`. Crear `components/games/arkanoid-canvas.tsx` con la estructura de `tetris-canvas.tsx`: `ResizeObserver` con DPR máximo 2, handle `end`/`restart`, `useEffectEvent`, overlay "ARKANOID" / "PULSA ESPACIO PARA EMPEZAR", `P`/`Esc` y auto-pausa. Añadir `arkanoid` a `GAME_REGISTRY` con `initialStats` `{ score: 0, lives: 3, level: 1 }`.
   - Resultado: `/juegos/arkanoid/jugar` se juega de principio a fin. El HUD muestra puntuación, vidas y nivel.
5. **Verificación del flujo completo.** Comprobar PAUSA, FIN, game over y victoria con 1 s de espera, el modal, GUARDAR PUNTUACIÓN con `submitScore` y JUGAR DE NUEVO, y corregir lo que falle. Después, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Acceptance criteria

- [x] `supabase/migrations/` contiene `convert_bloque_buster_to_arkanoid`, y `npx supabase migration list` la muestra aplicada en local y en remoto.
- [x] En `games` ya no existe `bloque-buster`. La fila `arkanoid` tiene `title = 'ARKANOID'`, `playable = true`, categoría `arcade`, `cover-bricks`, `cyan`, `sort_order` 2 y los textos que tenía BLOQUE BUSTER. Las demás filas no cambian.
- [x] Los advisors de seguridad no muestran avisos nuevos.
- [x] ARKANOID aparece en segunda posición en `/juegos` y en la Home, y como pestaña del Salón de la Fama, con la portada `cover-bricks`.
- [x] `/juegos/bloque-buster` da 404.
- [x] `/juegos/arkanoid/jugar` muestra los bloques del nivel 1, la paleta centrada y la pelota encima, bajo el texto "PULSA ESPACIO PARA EMPEZAR". Nada se mueve, ni con el ratón ni con las flechas, hasta pulsar Espacio.
- [x] Al pulsar Espacio, la pelota sale sola hacia arriba a la derecha.
- [x] `←` y `→` mueven la paleta sin salirse del canvas. Mover el ratón sobre el canvas centra la paleta en el cursor, también con el canvas escalado a 375 px de ancho.
- [x] La pelota rebota en las paredes izquierda, derecha y superior, y en la paleta, sin cambiar de ángulo.
- [x] Romper un bloque suma exactamente 10 puntos, lo hace desaparecer con un efecto breve en su color e invierte la dirección vertical de la pelota.
- [x] Si la pelota cae por debajo de la paleta, VIDAS baja en uno y la pelota vuelve a salir de la paleta.
- [x] Los 5 niveles tienen los patrones de `levels.js` (parrilla, pirámide, ajedrez, filas con huecos, marco + cruz), con los colores de la tabla.
- [x] Al romper el último bloque de un nivel, aparecen al instante los bloques del siguiente, el NIVEL del HUD sube y la pelota sale de la paleta más rápido (×1.10 por nivel respecto a la referencia).
- [x] Al romper el último bloque del nivel 5, la escena se ve congelada 1 s y después se abre "FIN DEL JUEGO" con la puntuación final.
- [x] Al perder la tercera vida, la escena se ve congelada 1 s y después se abre "FIN DEL JUEGO" con la puntuación final.
- [x] El HUD muestra la puntuación, las vidas y el nivel del motor.
- [x] El canvas no dibuja puntuación, nivel, vidas, PAUSA, GAME OVER, texto de victoria ni selector de niveles.
- [x] PAUSA, `P` y `Esc` congelan el juego y muestran "EN PAUSA". REANUDAR, `P` y `Esc` lo reanudan sin saltos. En pausa el ratón no mueve la paleta.
- [x] Pausar con una flecha pulsada y reanudar sin pulsarla no deja la paleta moviéndose sola.
- [x] Cambiar de pestaña o de ventana durante una partida la deja en EN PAUSA.
- [x] FIN a mitad de partida detiene el juego y abre el modal con la puntuación actual.
- [x] GUARDAR PUNTUACIÓN inserta una fila en `scores` para `arkanoid`. Después, `/juegos/arkanoid` muestra Partidas, Mejor global y el jugador en el ranking, y `/salon-de-la-fama?juego=arkanoid` lo muestra.
- [x] JUGAR DE NUEVO deja la puntuación en 0, VIDAS en 3, el nivel en 01, todos los bloques del nivel 1 y la paleta centrada, y vuelve a mostrar "PULSA ESPACIO PARA EMPEZAR".
- [x] Durante la partida, las flechas y Espacio no hacen scroll de la página. En el modal, el campo de iniciales acepta espacios, flechas y cualquier otra tecla.
- [x] Tras salir con SALIR o VOLVER AL VAULT, las teclas y el ratón no hacen nada en otras pantallas y no hay errores en la consola.
- [x] Entrar y salir del reproductor varias veces no acelera la pelota ni la paleta.
- [x] El canvas se ve nítido con `devicePixelRatio` 2 y ocupa todo el `.crt-screen`, también a 375 px de ancho.
- [x] Asteroids y Tetris se siguen jugando exactamente igual que en los SPEC 05 y 07.
- [x] En un mock (p. ej. SERPENTINA) se ve la simulación y el modal "ESTE JUEGO AÚN NO GUARDA PUNTUACIONES".
- [x] `game.js`, `levels.js`, `spritesheet.js` y los assets de la referencia no se importan ni se copian en `app/`, `components/`, `lib/` ni `public/`.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan sin errores.

## Decisions

- **Yes:** convertir el mock BLOQUE BUSTER en Arkanoid. Decisión del usuario. Es el mismo juego y evita tener dos juegos de ladrillos en el catálogo.
- **No:** fila nueva `arkanoid` manteniendo BLOQUE BUSTER como mock.
- **Yes:** cambiar el `code` a `arkanoid` y el título a `ARKANOID`. Decisión del usuario, igual que CAÍDA → TETRIS, aceptando que `/juegos/bloque-buster` pase a dar 404.
- **No:** conservar `code = bloque-buster`. La URL no coincidiría con el juego.
- **Yes:** mantener `sort_order` 2, `arcade`, `cover-bricks`, `cyan` y los textos. Ya describen el juego y no hay que desplazar filas.
- **Yes:** dibujo vectorial neón. Decisión del usuario: coherente con el portal, Asteroids y Tetris, y sin assets que cargar.
- **No:** el spritesheet original. Exigía crear `public/`, cargar la imagen de forma asíncrona y portar coordenadas, y desentona con el portal.
- **Yes:** un neón por cada color de la referencia (4 de `:root` más rojo, rosa y gris). Decisión del usuario: los niveles conservan el contraste entre filas.
- **No:** reducir a los 4 colores de `:root`.
- **Yes:** la victoria en el nivel 5 termina la partida. Decisión del usuario, igual que la referencia. La puntuación máxima es finita (2 080 con los 208 bloques de los 5 niveles), muy por debajo de 10 000 000.
- **No:** repetir los niveles en bucle más rápido. Es una mecánica que no está en la referencia.
- **No:** portar el selector de nivel de la pausa. Decisión del usuario: permitiría inflar las puntuaciones del leaderboard.
- **Yes:** saque automático, como en la referencia. Decisión del usuario.
- **No:** pelota pegada a la paleta hasta pulsar Espacio. Añadía una fase y una mecánica nuevas.
- **Yes:** rebote en la paleta y en los bloques igual que en la referencia (solo invierte `vy`, un bloque por frame). Decisión del usuario. Las mejoras de jugabilidad van en otro spec.
- **No:** ángulo según el punto de impacto.
- **Yes:** ratón y `←` `→`, con Espacio para empezar. Decisión del usuario: son los controles de la referencia, y Espacio es lo mismo que en Asteroids y Tetris.
- **No:** solo teclado.
- **No:** sonido en este spec. Decisión del usuario: ningún juego del portal tiene sonido todavía, y necesita `public/` y gestionar el autoplay.
- **Yes:** paso de nivel instantáneo, como en la referencia. Decisión del usuario.
- **No:** pausa de 1 s con "NIVEL N" en el canvas.
- **Yes:** 1 s con la escena congelada antes del modal, tanto en la derrota como en la victoria, sin texto en el canvas. Decisión del usuario, igual que Asteroids y Tetris.
- **No:** texto "¡COMPLETADO!" en el canvas ni modal inmediato.
- **Yes:** escena del nivel 1 quieta detrás del overlay de inicio. Decisión del usuario.
- **Yes:** el motor ignora el teclado y el ratón en `ready` y en pausa. Así el ratón no mueve la paleta antes de empezar ni durante la pausa.
- **Yes:** `PlayerHud` y `game-player.tsx` no cambian. Arkanoid tiene vidas, así que encaja en el HUD actual.
- **Yes:** copiar la estructura de `tetris-canvas.tsx` en lugar de extraer un hook común. No se toca código de los otros juegos salvo la línea del registry.
- **Yes:** no se cambia el leaderboard. La puntuación es un entero creciente de 0 a 2 080.

## Risks

| Risk                                                                                          | Mitigation                                                                                                                              |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| La pelota atraviesa un bloque o la paleta con `dt` grande (nivel 5 ≈ 440 px/s en vertical)    | `dt` limitado a 50 ms (≈ 22 px por frame, menos que la altura de un bloque, 24, y que la tolerancia de la paleta, 14 + 8).              |
| La colisión solo invierte `vy`, y un choque lateral puede dejar la pelota dentro de un bloque | Se mantiene a propósito, como en la referencia. Un bloque por frame evita romper una fila entera de golpe.                              |
| La posición del ratón no coincide con la paleta cuando el canvas está escalado                | Conversión con `getBoundingClientRect()` a coordenadas lógicas de 800. Hay un criterio de aceptación a 375 px.                          |
| La paleta sigue moviéndose tras una pausa porque se perdió el `keyup`                         | El estado de las flechas se limpia en `pause()`, `end()` y `restart()`. Hay un criterio de aceptación.                                  |
| El motor bloquea teclas en el input de iniciales                                              | `preventDefault` solo en `ready` y `playing`, nunca con el foco en un `input` o `textarea`, y el motor no hace nada fuera de `playing`. |
| Bucles o listeners que sobreviven al desmontar (Strict Mode monta dos veces)                  | `destroy()` cancela el rAF y quita los listeners de teclado y de ratón. Se prueba entrando y saliendo varias veces.                     |
| Salto de `dt` al volver de una pausa o de una pestaña oculta                                  | `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar.                                                                              |
| Enlaces externos o marcadores a `/juegos/bloque-buster` dan 404                               | Aceptado por el usuario. La redirección queda fuera de alcance.                                                                         |
| `shadowBlur` en 60 bloques baja los FPS                                                       | Glow moderado y solo en el contorno.                                                                                                    |
| Cambiar `code` con un `UPDATE` deja la página `/juegos/bloque-buster` en caché                | `npm run build` regenera las rutas. En desarrollo basta con recargar.                                                                   |

## What is **not** in this spec

- Sonido, spritesheet y la carpeta `public/`.
- Selector de nivel en la pausa.
- Ángulo de rebote según el impacto, saque manual, bloques resistentes, power-ups y enemigos.
- Pantalla "NIVEL N", texto de victoria y bucle de niveles tras el 5.
- Controles táctiles y gamepad.
- Portada o textos nuevos, y la redirección de `/juegos/bloque-buster`.
- Hook común para los componentes de canvas.
- Antitrampas y cambios en el leaderboard.
- Tests automatizados (no hay test runner configurado en el proyecto).

Cada uno de estos, si se necesita, va en su propio spec.
